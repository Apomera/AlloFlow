/* BirdLab 3D red-tailed hawk.
 * Feather painting, cambered wing surfaces, rooted feather flex and closed-wing
 * morphs are adapted from the procedural raptor in stem_tool_raptorhunt.js.
 * Three r128; no asset requests. Coordinates: forward -Z, dorsal +Y, metres.
 */
(function (global) {
  'use strict';

  function create(THREE) {
    var featherArt = global.AvianFeatherArt;
    if (!featherArt || typeof featherArt.createFlightFeatherCanvas !== 'function' || typeof featherArt.createVaneDetailCanvases !== 'function') {
      throw new Error('BirdLab 3D requires avian_feather_art.js before creating a bird.');
    }
    var root = new THREE.Group();
    root.name = 'birdlab-red-tailed-hawk';
    root.userData = {
      species: 'Red-tailed Hawk', scientificName: 'Buteo jamaicensis',
      anatomy: 'cambered wings, layered coverts, slotted primaries, twelve tail feathers, four toes',
      forwardAxis: '-Z', wingspanMetres: 1.24,
      provenance: 'Adapted from Raptor Lab procedural feather, camber, primary-flex and resting-morph methods'
    };
    var geometries = [], materials = [], textures = [], wings = [], tailFeathers = [], feet = [];
    var featherCount = 0, disposed = false;
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    var noise = function (a, b) { var n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
    function geometry(g) { geometries.push(g); return g; }
    function material(options) {
      var m = new THREE.MeshStandardMaterial(options);
      m.color.convertSRGBToLinear(); materials.push(m); return m;
    }
    function texture(canvas, name, linear) {
      var t = new THREE.CanvasTexture(canvas); t.name = name;
      t.encoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
      t.anisotropy = 4; textures.push(t); return t;
    }
    function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function addMesh(parent, g, m, name) {
      var mesh = new THREE.Mesh(g, m); mesh.name = name;
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }

    // Neutral relief, rather than painted black outlines, separates individual
    // contour feathers. Pigment is supplied by the continuous body surface.
    var contourCanvas = canvas(512, 512), c = contourCanvas.getContext('2d');
    c.fillStyle = '#dededb'; c.fillRect(0, 0, 512, 512);
    for (var row = -2; row < 18; row++) for (var column = -1; column < 18; column++) {
      var x = column * 32 + (row % 2) * 16 + (noise(row + 9, column) - 0.5) * 5, y = row * 32;
      var length = 41 + noise(row, column) * 9, half = 15 + noise(column, row + 2) * 2;
      c.save(); c.translate(x, y); c.rotate((noise(row + 3, column) - 0.5) * 0.12);
      var gradient = c.createLinearGradient(-half, 0, half, 0);
      gradient.addColorStop(0, '#d5d3cd'); gradient.addColorStop(0.46, '#e6e4dd'); gradient.addColorStop(1, '#dcdad3');
      c.fillStyle = gradient; c.beginPath(); c.moveTo(-half, -5);
      c.bezierCurveTo(-half * 1.04, length * 0.4, -half * 0.5, length * 0.9, 0, length);
      c.bezierCurveTo(half * 0.55, length * 0.90, half, length * 0.35, half, -5); c.closePath(); c.fill(); c.clip();
      for (var barb = 3; barb < length; barb += 1.5 + noise(row + barb, column) * 0.7) {
        var reach = half * (1 - Math.pow(barb / length, 3));
        c.strokeStyle = 'rgba(50,45,35,.075)'; c.lineWidth = 0.45;
        [-1, 1].forEach(function (side) {
          c.beginPath(); c.moveTo(0, barb + 2); c.quadraticCurveTo(side * reach * 0.6, barb - 1, side * reach, barb - 7); c.stroke();
        });
      }
      c.strokeStyle = 'rgba(255,255,245,.16)'; c.lineWidth = 0.55;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, length - 3); c.stroke(); c.restore();
    }
    var contour = texture(contourCanvas, 'hawk-contour-feather-relief');
    contour.wrapS = contour.wrapT = THREE.RepeatWrapping; contour.repeat.set(1.1, 1.15);
    // Short, directional facial feathers replace scaled-down body scallops.
    // Their irregular shafts and fine paired barbs stay soft at a distance.
    var headCanvas = canvas(512, 512), facePaint = headCanvas.getContext('2d');
    facePaint.fillStyle = '#dfdcd4'; facePaint.fillRect(0, 0, 512, 512);
    // Medium feather groups survive mipmapping at the observation distance;
    // the fine shafts below add texture when the camera moves closer.
    for (var mediumRow = -2; mediumRow < 20; mediumRow++) for (var mediumLane = -2; mediumLane < 25; mediumLane++) {
      var mx = mediumLane * 23 + (mediumRow % 2) * 11.5 + (noise(mediumRow + 5, mediumLane) - 0.5) * 7;
      var my = mediumRow * 29, ml = 34 + noise(mediumLane, mediumRow + 11) * 13, mw = 7 + noise(mediumRow, mediumLane + 9) * 3;
      facePaint.save(); facePaint.translate(mx, my); facePaint.rotate((noise(mediumRow, mediumLane + 19) - 0.5) * 0.42);
      var mediumShade = facePaint.createLinearGradient(-mw, 0, mw, ml);
      mediumShade.addColorStop(0, 'rgba(95,75,51,.03)'); mediumShade.addColorStop(0.65, 'rgba(95,75,51,.13)'); mediumShade.addColorStop(1, 'rgba(252,240,215,.24)');
      facePaint.fillStyle = mediumShade; facePaint.beginPath(); facePaint.moveTo(-mw, 0);
      facePaint.quadraticCurveTo(-mw * 0.65, ml * 0.62, 0, ml); facePaint.quadraticCurveTo(mw * 0.62, ml * 0.56, mw, 0); facePaint.closePath(); facePaint.fill();
      facePaint.restore();
    }
    for (var faceRow = -2; faceRow < 35; faceRow++) for (var faceLane = -2; faceLane < 45; faceLane++) {
      var fx = faceLane * 12 + (faceRow % 2) * 6 + (noise(faceRow, faceLane + 11) - 0.5) * 4;
      var fy = faceRow * 16 + (noise(faceLane, faceRow + 31) - 0.5) * 5;
      var fl = 17 + noise(faceRow + 7, faceLane) * 11, fw = 3.4 + noise(faceLane, faceRow + 2) * 2.3;
      facePaint.save(); facePaint.translate(fx, fy); facePaint.rotate((noise(faceRow + 23, faceLane) - 0.5) * 0.40);
      var faceShade = facePaint.createLinearGradient(0, 0, 0, fl);
      faceShade.addColorStop(0, 'rgba(88,75,58,0)'); faceShade.addColorStop(0.58, 'rgba(88,75,58,.035)'); faceShade.addColorStop(1, 'rgba(88,75,58,.10)');
      facePaint.strokeStyle = faceShade; facePaint.lineWidth = 0.6;
      facePaint.beginPath(); facePaint.moveTo(0, 0); facePaint.quadraticCurveTo(fw * 0.12, fl * 0.6, 0, fl); facePaint.stroke();
      for (var faceBarb = 3; faceBarb < fl; faceBarb += 2.1 + noise(faceBarb, faceLane) * 0.7) {
        var spread = fw * Math.sin(faceBarb / fl * Math.PI) * (0.76 + noise(faceBarb, faceRow) * 0.24);
        [-1, 1].forEach(function (side) {
          facePaint.strokeStyle = side < 0 ? 'rgba(90,77,58,.052)' : 'rgba(255,252,240,.12)'; facePaint.lineWidth = 0.5;
          facePaint.beginPath(); facePaint.moveTo(0, faceBarb + 2); facePaint.quadraticCurveTo(side * spread * 0.55, faceBarb, side * spread, faceBarb - 4); facePaint.stroke();
        });
      }
      facePaint.restore();
    }
    var headRelief = texture(headCanvas, 'hawk-fine-facial-feathers');
    headRelief.wrapS = headRelief.wrapT = THREE.RepeatWrapping; headRelief.repeat.set(1.25, 1.15);

    // Each flight feather has one continuous shaft and parallel barbs, with
    // separate data textures for subtle normal relief and matte roughness.
    var vaneArt = featherArt.createFlightFeatherCanvas(), vane = texture(vaneArt, 'hawk-flight-vane');
    var tailTexture = texture(featherArt.createFlightFeatherCanvas({ tail: true }), 'hawk-rust-tail-vane');
    var unbarredVaneArt = featherArt.createFlightFeatherCanvas({ contourFeather: true });
    var vaneDetails = featherArt.createVaneDetailCanvases(unbarredVaneArt);
    var normalCanvas = vaneDetails.normal, roughCanvas = vaneDetails.roughness;
    var vaneNormal = texture(normalCanvas, 'hawk-vane-normal', true), vaneRough = texture(roughCanvas, 'hawk-vane-roughness', true);
    function featherMaterial(color, map) {
      return material({ color: color, map: map || vane, normalMap: vaneNormal, normalScale: new THREE.Vector2(0.36, 0.36),
        roughnessMap: vaneRough, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, vertexColors: true, morphTargets: true, morphNormals: true });
    }
    var wingMaterial = featherMaterial(0xffffff), primaryMaterial = featherMaterial(0xffffff);
    var tailMaterial = featherMaterial(0xb86b42, tailTexture);
    var contourVane = texture(unbarredVaneArt, 'hawk-unbarred-contour-vane');
    var contourMaterial = featherMaterial(0xffffff, contourVane);
    // The same surface is brown above and buff below. Its pigmentation follows
    // the mesh through flapping/folding; there are no floating marking decals.
    var foldedPigment = { value: 1 };
    function underwing(m, dark) {
      m.extensions = { derivatives: true };
      m.onBeforeCompile = function (shader) {
        shader.uniforms.blFoldedPigment = foldedPigment;
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 birdWingCoord;\nvarying vec2 vBirdWingCoord;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBirdWingCoord=birdWingCoord;');
        shader.fragmentShader = 'uniform float blFoldedPigment;\nvarying vec2 vBirdWingCoord;\n' + shader.fragmentShader;
        // These coordinates belong to the fully spread, authored wing. They
        // are interpolated on the same vertices through both wing morphs, so
        // the pigment never slides when a wrist bends or a wing folds.
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + [
          'if (!gl_FrontFacing) {',
          '  float span=vBirdWingCoord.x,chord=vBirdWingCoord.y;',
          '  float shaft=1.0-vUv.y;',
          '  float featherVariation=fract(sin(floor(vUv.x*4.0)*17.71+4.3)*117.13);',
          '  float barWave=sin((shaft*5.1+featherVariation*0.21)*6.2831853);',
          '  float barAA=max(fwidth(barWave),0.15);',
          '  float barring=smoothstep(0.12-barAA,0.52+barAA,barWave);',
          dark ?
            '  vec3 underColor=mix(vec3(0.46,0.43,0.36),vec3(0.075,0.068,0.055),smoothstep(0.43,0.94,shaft));' :
            '  vec3 underColor=mix(vec3(0.68,0.63,0.52),vec3(0.39,0.36,0.30),smoothstep(0.55,1.04,chord));',
          dark ?
            '  underColor*=1.0-barring*0.18*(1.0-smoothstep(0.70,1.0,shaft));' :
            '  underColor*=1.0-barring*0.15*smoothstep(0.43,0.88,chord);',
          dark ? '' :
            '  float leadingBand=(1.0-smoothstep(0.19,0.38,chord))*smoothstep(0.015,0.13,span)*(1.0-smoothstep(0.54,0.76,span));',
          dark ? '' :
            '  underColor=mix(underColor,vec3(0.13,0.095,0.062),leadingBand*0.90);',
          '  underColor*=0.975+featherVariation*0.055;',
          '  diffuseColor.rgb=mix(diffuseColor.rgb,underColor*texelColor.rgb,0.93*(1.0-blFoldedPigment));',
          '}'
        ].join('\n'));
      };
      m.customProgramCacheKey = function () { return 'birdlab-underwing-markings-v2-' + dark; };
    }
    underwing(wingMaterial, false); underwing(primaryMaterial, true);

    var upperBody = new THREE.Group(); upperBody.name = 'hawk-perching-posture'; root.add(upperBody);
    var torso = new THREE.Group(); torso.name = 'hawk-breathing-torso'; upperBody.add(torso);
    var bodyGeo = geometry(new THREE.SphereGeometry(1, 48, 32)); bodyGeo.rotateX(Math.PI / 2);
    var bp = bodyGeo.attributes.position, colors = [], dorsal = new THREE.Color(0x604839).convertSRGBToLinear();
    var breast = new THREE.Color(0xd6cbb0).convertSRGBToLinear(), shade = new THREE.Color();
    for (var bi = 0; bi < bp.count; bi++) {
      var bx = bp.getX(bi), by = bp.getY(bi), bz = bp.getZ(bi);
      var shoulder = Math.exp(-Math.pow((bz + 0.25) / 0.65, 2));
      var taper = 1 - smooth(-0.04, 0.92, bz) * 0.27;
      bp.setXYZ(bi, bx * (0.060 + shoulder * 0.028) * taper, by * (0.075 + shoulder * 0.014) * taper + 0.008 * shoulder, bz * 0.218);
      var pale = (1 - smooth(-0.32, 0.23, by)) * (1 - smooth(0.50, 0.9, bz));
      shade.copy(dorsal).lerp(breast, pale); colors.push(shade.r, shade.g, shade.b);
    }
    bodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); bodyGeo.computeVertexNormals();
    var bodyMaterial = material({ color: 0xffffff, vertexColors: true, roughness: 0.96, map: contour, bumpMap: contour, bumpScale: 0.00065 });
    bodyMaterial.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBirdBody;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBirdBody=position;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBirdBody;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + [
          'vec3 bp=vBirdBody/vec3(0.095,0.096,0.205);',
          'float row=(bp.z+1.0)*5.2;',
          'float lane=atan(bp.x,-bp.y)*7.4+mod(floor(row),2.0)*0.47;',
          'float seed=fract(sin(floor(lane)*127.1+floor(row)*311.7)*43758.5453);',
          'float width=mix(0.11,0.24,smoothstep(0.08,0.83,fract(row)))*(0.84+seed*0.32);',
          'float streak=length(vec2((fract(lane)-0.5+(seed-0.5)*0.16)/width,(fract(row)-0.5)/0.48));',
          'float aa=max(fwidth(streak),0.10);',
          'float ink=(1.0-smoothstep(0.70-aa,1.0+aa,streak))*(1.0-smoothstep(-0.12,0.35,bp.y));',
          'ink*=1.0-smoothstep(0.18,0.66,abs(bp.z+0.02));',
          'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.10,0.068,0.039)*texelColor.rgb,ink*0.91);',
          'float mantleLane=atan(bp.x,bp.y)*7.0+mod(floor(row),2.0)*0.47;',
          'float mantleStreak=length(vec2((fract(mantleLane)-0.5)/0.32,(fract(row)-0.5)/0.44));',
          'float mantleAA=max(fwidth(mantleStreak),0.11);',
          'float mantleMark=(1.0-smoothstep(0.65-mantleAA,1.0+mantleAA,mantleStreak))*smoothstep(-0.08,0.40,bp.y);',
          'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.43,1.33,1.18),mantleMark*0.46);',
          'float throat=(1.0-smoothstep(-0.76,-0.40,bp.z))*(1.0-smoothstep(-0.20,0.35,bp.y));',
          'float throatLane=atan(bp.x,-bp.y)*37.0+sin(bp.z*12.0)*0.16;',
          'float throatLine=abs(fract(throatLane)-0.5),throatAA=max(fwidth(throatLane),0.035);',
          'float throatFiber=1.0-smoothstep(0.035,0.08+throatAA,throatLine);',
          'diffuseColor.rgb*=1.0-throat*throatFiber*0.065;'
        ].join('\n'));
    };
    bodyMaterial.customProgramCacheKey = function () { return 'birdlab-hawk-belly-band-v3'; };
    addMesh(torso, bodyGeo, bodyMaterial, 'continuous-mantle-and-streaked-breast');

    var head = new THREE.Group(); head.name = 'hawk-head-gaze'; head.position.set(0, 0.068, -0.202); torso.add(head);
    var headGeo = geometry(new THREE.SphereGeometry(1, 36, 26)), hp = headGeo.attributes.position, hc = [];
    for (var hi = 0; hi < hp.count; hi++) {
      var hx = hp.getX(hi), hy = hp.getY(hi), hz = hp.getZ(hi);
      var cheek = smooth(-0.35, -0.9, hy);
      var forehead = smooth(-0.18, -0.85, hz) * smooth(-0.12, 0.72, hy);
      hp.setXYZ(hi, hx * 0.059 * (1 - cheek * 0.31), hy * 0.058 - smooth(0.20, 1, hy) * 0.017 + cheek * 0.018 - forehead * 0.005, hz * 0.076 - Math.max(0, hy) * 0.009 + cheek * 0.007);
      shade.copy(dorsal).lerp(breast, (1 - smooth(-0.64, 0.14, hy)) * (1 - smooth(0.0, 0.7, hz)) * 0.73);
      hc.push(shade.r, shade.g, shade.b);
    }
    headGeo.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3)); headGeo.computeVertexNormals();
    var headMaterial = material({ color: 0xffffff, vertexColors: true, roughness: 0.98, map: headRelief, bumpMap: headRelief, bumpScale: 0.0004 });
    headMaterial.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHawkHead;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHawkHead=position;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHawkHead;').replace('#include <color_fragment>', '#include <color_fragment>\n' + [
        'vec3 h=vHawkHead/vec3(0.059,0.058,0.076);',
        'float r=(h.z+1.0)*5.5;',
        'float lane=atan(h.x,h.y)*7.6+mod(floor(r),2.0)*0.43+sin(h.z*7.0)*0.18;',
        'float cell=fract(sin(floor(lane)*41.1+floor(r)*17.3)*471.31);',
        'float mark=length(vec2((fract(lane)-0.5+(cell-0.5)*0.16)/0.27,(fract(r)-0.5)/0.48));',
        'float edge=max(fwidth(mark),0.12);',
        'float grain=(1.0-smoothstep(0.65-edge,1.0+edge,mark));',
        'diffuseColor.rgb*=1.0-grain*(0.19+cell*0.12);',
        'float featherTip=grain*smoothstep(0.40,0.91,fract(r));',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.75,1.58,1.34),featherTip*0.42);',
        'float nape=smoothstep(-0.12,0.65,h.z)*(1.0-smoothstep(0.12,0.65,h.y));',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.36,1.27,1.14),nape*featherTip*0.42);',
        'float neckEdge=(1.0-smoothstep(0.06,0.30,abs(h.y+0.22)))*(1.0-smoothstep(0.04,0.7,h.z));',
        'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.40,0.35,0.27)*texelColor.rgb,neckEdge*featherTip*0.30);',
        'float brow=(1.0-smoothstep(0.04,0.16,abs(h.y-0.20)))*smoothstep(0.42,0.78,abs(h.x))*(1.0-smoothstep(-0.05,0.50,h.z));',
        'float malar=(1.0-smoothstep(0.10,0.29,abs(h.z+0.22+h.y*0.28)))*smoothstep(0.45,0.82,abs(h.x))*(1.0-smoothstep(-0.15,0.12,h.y));',
        'diffuseColor.rgb*=1.0-brow*0.27-malar*0.25;'
      ].join('\n'));
    };
    headMaterial.customProgramCacheKey = function () { return 'birdlab-hawk-crown-feathers-v5'; };
    addMesh(head, headGeo, headMaterial, 'sculpted-small-hawk-head');
    var eyeGeo = geometry(new THREE.SphereGeometry(1, 20, 14));
    var orbitMat = material({ color: 0x302b24, roughness: 0.85 });
    var irisMat = material({ color: 0x967749, roughness: 0.43 });
    irisMat.extensions = { derivatives: true };
    irisMat.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vHawkIris;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHawkIris=position.xy;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vHawkIris;').replace('#include <color_fragment>', '#include <color_fragment>\n' + [
        'float radius=length(vHawkIris),angle=atan(vHawkIris.y+0.000001,vHawkIris.x+0.000001);',
        'float fiber=sin(angle*83.0+sin(angle*11.0)*1.4+radius*8.0);',
        'float detail=1.0-smoothstep(0.45,1.2,fwidth(angle)*83.0);',
        'diffuseColor.rgb*=1.0+fiber*detail*0.11;',
        'diffuseColor.rgb*=1.0-smoothstep(0.76,0.98,radius)*0.42;'
      ].join('\n'));
    };
    irisMat.customProgramCacheKey = function () { return 'birdlab-hawk-radial-iris-v1'; };
    var pupilMat = material({ color: 0x0b0c0b, roughness: 0.11 });
    var browMat = material({ color: 0x604839, map: headRelief, bumpMap: headRelief, bumpScale: 0.00024, roughness: 0.97 });
    var eyes = [];
    [-1, 1].forEach(function (side) {
      var normal = new THREE.Vector3(side * 0.86, 0.14, -0.50).normalize();
      var eyeRig = new THREE.Group(); eyeRig.name = 'hawk-eye-' + side;
      eyeRig.position.set(side * 0.052, 0.015, -0.039); eyeRig.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); head.add(eyeRig); eyes.push(eyeRig);
      var orbit = addMesh(eyeRig, eyeGeo, orbitMat, 'fine-orbital-rim'); orbit.scale.set(0.0094, 0.0080, 0.003);
      var iris = addMesh(eyeRig, eyeGeo, irisMat, 'amber-iris'); iris.scale.set(0.0072, 0.0066, 0.0028); iris.position.z = 0.0019;
      var pupil = addMesh(eyeRig, eyeGeo, pupilMat, 'small-pupil'); pupil.scale.set(0.0042, 0.0043, 0.0017); pupil.position.z = 0.0041;
      // The supraorbital ridge shades a raptor's eye and breaks the round,
      // toy-like face. It is part of the head, so a blink never squeezes it.
      var brow = addMesh(head, eyeGeo, browMat, 'feathered-supraorbital-ridge-' + side);
      brow.position.set(side * 0.053, 0.024, -0.042); brow.scale.set(0.010, 0.0048, 0.021);
      brow.rotation.y = side * 0.40; brow.rotation.z = side * -0.18;
    });
    var keratinCanvas = canvas(128, 256), kc = keratinCanvas.getContext('2d');
    kc.fillStyle = '#dddcd6'; kc.fillRect(0, 0, 128, 256);
    for (var ridge = 0; ridge < 180; ridge++) {
      var rx = noise(ridge, 41) * 128, ry = noise(ridge, 19) * 256;
      kc.strokeStyle = ridge % 3 ? 'rgba(70,65,55,.065)' : 'rgba(255,255,245,.12)'; kc.lineWidth = 0.45;
      kc.beginPath(); kc.moveTo(rx, ry); kc.quadraticCurveTo(rx + 1.5, ry + 8, rx + 0.5, ry + 14 + noise(ridge, 4) * 22); kc.stroke();
    }
    var keratin = texture(keratinCanvas, 'hawk-fine-keratin-growth');
    var billMat = material({ color: 0x40423d, map: keratin, bumpMap: keratin, bumpScale: 0.000055, roughness: 0.37 });
    billMat.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHawkBill;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHawkBill=position;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHawkBill;').replace('#include <color_fragment>', '#include <color_fragment>\n' + [
        'float jawLine=-0.014-(-vHawkBill.z-0.057)*0.18;',
        'float seam=(1.0-smoothstep(0.00045,0.0012,abs(vHawkBill.y-jawLine)))*smoothstep(0.004,0.014,abs(vHawkBill.x));',
        'diffuseColor.rgb*=1.0-seam*0.32;'
      ].join('\n'));
    };
    billMat.customProgramCacheKey = function () { return 'birdlab-hawk-keratin-jaw-v1'; };
    var cereMat = material({ color: 0xb99a58, map: keratin, bumpMap: keratin, bumpScale: 0.00007, roughness: 0.82 });
    var cere = addMesh(head, eyeGeo, cereMat, 'subdued-yellow-cere'); cere.scale.set(0.023, 0.014, 0.019); cere.position.set(0, -0.008, -0.062);
    // A narrow upper bill with a downturned tip, adapted from Raptor Lab's
    // cross-section method; its profile never becomes a cartoon cone.
    var billP = [], billUV = [], billI = [];
    var sections = [[-0.057,-0.006,0.024,0.016],[-0.077,-0.008,0.018,0.014],[-0.097,-0.012,0.010,0.012],[-0.109,-0.021,0.005,0.011],[-0.106,-0.039,0.0008,0.0015]];
    sections.forEach(function (s, row) {
      for (var j = 0; j < 16; j++) {
        var a = j / 16 * Math.PI * 2; billP.push(Math.cos(a) * s[2], s[1] + Math.sin(a) * s[3], s[0]); billUV.push(j / 16, row / 4);
        if (row < 4) { var a0 = row * 16 + j, a1 = row * 16 + (j + 1) % 16; billI.push(a0, a0 + 16, a1, a1, a0 + 16, a1 + 16); }
      }
    });
    var billGeo = geometry(new THREE.BufferGeometry()); billGeo.setAttribute('position', new THREE.Float32BufferAttribute(billP, 3)); billGeo.setAttribute('uv', new THREE.Float32BufferAttribute(billUV, 2)); billGeo.setIndex(billI); billGeo.computeVertexNormals();
    addMesh(head, billGeo, billMat, 'curved-keratin-hook');
    [-1, 1].forEach(function (side) {
      var nostril = addMesh(head, eyeGeo, orbitMat, 'nostril-' + side); nostril.position.set(side * 0.0203, -0.005, -0.068); nostril.scale.set(0.0012, 0.0025, 0.0035);
    });

    function batch() { return { p: [], uv: [], c: [], i: [] }; }
    // Shared curved vane construction: seven stations and a ridge down the
    // shaft. Layered vanes are batched, while slotted tips keep quill pivots.
    function appendFeather(b, start, end, width, color, camber, handedness) {
      featherCount++;
      var vaneVariant = Math.floor(noise(featherCount, 23) * 4), pigment = 0.97 + noise(featherCount, 37) * 0.055;
      var dx = end[0] - start[0], dz = end[2] - start[2], length = Math.hypot(dx, dz);
      var acrossX = -dz / Math.max(length, 0.001), acrossZ = dx / Math.max(length, 0.001);
      var stations = [0, 0.17, 0.36, 0.56, 0.74, 0.88, 0.97, 1], widths = [0.52, 0.88, 1, 0.98, 0.87, 0.61, 0.28, 0.035];
      var base = b.p.length / 3, tint = new THREE.Color(color).convertSRGBToLinear();
      for (var row = 0; row < stations.length; row++) {
        var t = stations[row];
        for (var col = 0; col < 5; col++) {
          // Mirrored wings reverse the across-vector. Flip the narrow vane
          // with it so both wings retain the same anatomical leading edge.
          var cross = col / 2 - 1, asymmetric = cross * (handedness || 1) < 0 ? 0.83 : 1;
          var bend = Math.sin(t * Math.PI) * (camber || 0.0035);
          b.p.push(start[0] + dx * t + acrossX * cross * width * widths[row] * asymmetric,
            start[1] + (end[1] - start[1]) * t + bend * (1 - cross * cross * 0.55),
            start[2] + dz * t + acrossZ * cross * width * widths[row] * asymmetric);
          b.uv.push((vaneVariant + 0.008 + col / 4 * 0.984) / 4, 1 - t);
          var edge = (0.965 + (1 - Math.abs(cross)) * 0.025 + Math.pow(t, 6) * 0.035) * pigment;
          edge *= 0.97 + smooth(0.02, 0.44, t) * 0.03;
          b.c.push(tint.r * edge, tint.g * edge, tint.b * edge);
          if (row < stations.length - 1 && col < 4) { var v = base + row * 5 + col; b.i.push(v, v + 1, v + 5, v + 1, v + 6, v + 5); }
        }
      }
    }
    function finishBatch(b) {
      var g = geometry(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setIndex(b.i); g.computeVertexNormals(); return g;
    }
    // Scapulars and flank feathers follow the actual torso surface. Their
    // staggered, slightly lifted tips create a feathered silhouette and catch
    // grazing light without adding hundreds of separate draw calls.
    function contourPoint(z, angle, lift) {
      var normalizedZ = z / 0.218, radius = Math.sqrt(Math.max(0.001, 1 - normalizedZ * normalizedZ));
      var shoulderWidth = Math.exp(-Math.pow((normalizedZ + 0.25) / 0.65, 2));
      var taper = 1 - smooth(-0.04, 0.92, normalizedZ) * 0.27;
      return [Math.sin(angle) * (radius * (0.060 + shoulderWidth * 0.028) * taper + lift),
        Math.cos(angle) * (radius * (0.075 + shoulderWidth * 0.014) * taper + lift) + 0.008 * shoulderWidth, z];
    }
    var mantleFeathers = batch(), contourRows = [0, 0.18, 0.40, 0.62, 0.81, 0.95, 1];
    for (var contourRow = 0; contourRow < 6; contourRow++) {
      for (var contourLane = 0; contourLane < 17; contourLane++) {
        var angle = (contourLane - 8 + (contourRow % 2) * 0.5) * 0.205;
        var startZ = -0.159 + contourRow * 0.045 + (noise(contourRow, contourLane) - 0.5) * 0.005;
        var plumeLength = 0.063 + noise(contourLane, contourRow + 7) * 0.010;
        var baseVertex = mantleFeathers.p.length / 3;
        var plumeColor = new THREE.Color([0x654b37, 0x6c513b, 0x614835, 0x715641][(contourRow + contourLane) % 4]).convertSRGBToLinear();
        featherCount++;
        for (var contourStation = 0; contourStation < contourRows.length; contourStation++) {
          var t = contourRows[contourStation], tipShape = [0.66, 0.90, 1, 0.93, 0.73, 0.30, 0.025][contourStation];
          for (var contourCross = 0; contourCross < 5; contourCross++) {
            var cross = contourCross / 2 - 1;
            var point = contourPoint(startZ + plumeLength * t, angle + cross * tipShape * 0.146 + Math.sign(angle) * t * 0.040,
              0.0008 + Math.sin(t * Math.PI) * 0.0016 + t * t * 0.0022 + (1 - cross * cross) * 0.0006);
            mantleFeathers.p.push(point[0], point[1], point[2]);
            var mantleVariant = Math.floor(noise(contourRow, contourLane + 23) * 4);
            mantleFeathers.uv.push((mantleVariant + 0.008 + contourCross / 4 * 0.984) / 4, 1 - t);
            var edgeTint = 0.97 + Math.pow(t, 5) * 0.045 + (1 - Math.abs(cross)) * 0.018;
            mantleFeathers.c.push(plumeColor.r * edgeTint, plumeColor.g * edgeTint, plumeColor.b * edgeTint);
            if (contourStation < contourRows.length - 1 && contourCross < 4) {
              var vertex = baseVertex + contourStation * 5 + contourCross;
              mantleFeathers.i.push(vertex, vertex + 5, vertex + 1, vertex + 1, vertex + 5, vertex + 6);
            }
          }
        }
      }
    }
    addMesh(torso, finishBatch(mantleFeathers), contourMaterial, 'layered-scapular-mantle-and-flank-plumes');
    // Closed pose wraps every layer around the flank. It is authored once;
    // animation only changes morph weights and joint rotations.
    function addClosedMorph(g, offset, side) {
      var source = g.attributes.position, closed = [];
      for (var i = 0; i < source.count; i++) {
        var x = source.getX(i) + offset.x, y = source.getY(i) + offset.y, z = source.getZ(i) + offset.z;
        var u = clamp((Math.abs(x) - 0.05) / 0.58, 0, 1), chord = clamp((z + 0.12) / 0.28, 0, 1);
        var foldedZ = -0.122 + u * 0.388 + chord * 0.034;
        var radius = 0.093 * Math.sqrt(Math.max(0.18, 1 - Math.pow((foldedZ + 0.015) / 0.32, 2)));
        var angle = 0.85 + chord * 0.92, relief = Math.max(0, y - 0.022) * 0.16;
        closed.push(side * (radius * Math.sin(angle) + relief) - offset.x, radius * Math.cos(angle) + 0.014 - offset.y, foldedZ - offset.z);
      }
      var temp = g.clone(); temp.setAttribute('position', new THREE.Float32BufferAttribute(closed, 3)); temp.computeVertexNormals();
      g.morphAttributes.position = [temp.attributes.position]; g.morphAttributes.normal = [temp.attributes.normal]; temp.dispose();
    }
    function wingSurface(u, v, side) {
      var leading = u < 0.56 ? -0.112 - 0.038 * Math.sin(u / 0.56 * Math.PI * 0.8) : -0.147 + (u - 0.56) * 0.18;
      var rear = u < 0.56 ? 0.129 + Math.sin(u / 0.56 * Math.PI * 0.64) * 0.017 : 0.148 - (u - 0.56) * 0.26;
      return [side * (0.064 + u * 0.48), 0.025 + Math.sin(u * Math.PI) * 0.018 + Math.sin(v * Math.PI) * 0.011, leading + (rear - leading) * v];
    }
    function meshInJoint(parent, b, m, name, offset, side) {
      var wingCoords = [];
      for (var i = 0; i < b.p.length; i += 3) {
        var span = clamp((Math.abs(b.p[i]) - 0.064) / 0.48, 0, 1);
        var leading = span < 0.56 ? -0.112 - 0.038 * Math.sin(span / 0.56 * Math.PI * 0.8) : -0.147 + (span - 0.56) * 0.18;
        var rear = span < 0.56 ? 0.129 + Math.sin(span / 0.56 * Math.PI * 0.64) * 0.017 : 0.148 - (span - 0.56) * 0.26;
        wingCoords.push(span, (b.p[i + 2] - leading) / (rear - leading));
        b.p[i] -= offset.x; b.p[i + 1] -= offset.y; b.p[i + 2] -= offset.z;
      }
      var g = finishBatch(b);
      g.setAttribute('birdWingCoord', new THREE.Float32BufferAttribute(wingCoords, 2));
      addClosedMorph(g, offset, side);
      var mesh = addMesh(parent, g, m, name); mesh.updateMorphTargets(); return mesh;
    }
    function addPrimaryFlex(mesh) {
      var g = mesh.geometry, positions = g.attributes.position.clone(), uv = g.attributes.uv;
      // A second morph bends the distal vane while keeping the quill root
      // anchored. It combines with the closed-wing morph without per-frame
      // geometry allocation or the rigid-paddle motion of a simple rotation.
      for (var vertex = 0; vertex < positions.count; vertex++) {
        var along = 1 - uv.getY(vertex), bend = along * along * along;
        positions.setY(vertex, positions.getY(vertex) + bend * 0.020);
        positions.setZ(vertex, positions.getZ(vertex) + bend * 0.004);
      }
      var curved = new THREE.BufferGeometry(); curved.setAttribute('position', positions); curved.setIndex(g.index.clone()); curved.computeVertexNormals();
      g.morphAttributes.position.push(curved.attributes.position); g.morphAttributes.normal.push(curved.attributes.normal);
      curved.dispose(); mesh.updateMorphTargets();
    }
    [-1, 1].forEach(function (side) {
      var shoulder = new THREE.Group(); shoulder.name = (side < 0 ? 'left' : 'right') + '-shoulder'; shoulder.position.set(side * 0.064, 0.025, -0.085); upperBody.add(shoulder);
      var wrist = new THREE.Group(); wrist.name = 'articulated-wrist'; wrist.position.set(side * 0.265, 0.013, -0.027); shoulder.add(wrist);
      var shoulderOffset = shoulder.position.clone(), wristOffset = shoulder.position.clone().add(wrist.position);
      var rig = { side: side, shoulder: shoulder, wrist: wrist, meshes: [], primaries: [] };
      var inner = batch(), outer = batch();
      // Full remiges below three staggered rows of coverts. Irregular lengths
      // and subtly changing pigment prevent a stamped, sawtooth appearance.
      for (var layer = 0; layer < 4; layer++) {
        var count = [28, 33, 39, 42][layer];
        for (var f = 0; f < count; f++) {
          var u = 0.015 + (f + 0.5) / count * (layer === 0 ? 0.94 : 0.98);
          var rootV = [0.10, 0.10, 0.055, 0.0][layer], tipV = [1.055, 0.77, 0.48, 0.23][layer];
          var start = wingSurface(u, rootV, side), end = wingSurface(u + 0.015, tipV + noise(f, layer) * 0.026, side);
          var lift = layer * 0.003; start[1] += lift; end[1] += lift;
          var palette = layer === 0 ? [0x645544,0x6c5c48,0x5e4c3d] : [0x6f5741,0x775d44,0x67513e,0x7b624b];
          appendFeather(u < 0.55 ? inner : outer, start, end, 0.48 / count * 0.70, palette[(f + layer) % palette.length], 0.0025, side);
        }
      }
      rig.meshes.push(meshInJoint(shoulder, inner, wingMaterial, 'layered-inner-wing-feathers', shoulderOffset, side));
      rig.meshes.push(meshInJoint(wrist, outer, wingMaterial, 'layered-outer-wing-feathers', wristOffset, side));
      // The thumb feathers lift at low speed. Kept on a separate pivot, they
      // follow the wrist and lie flush along the leading edge while gliding.
      var alula = new THREE.Group(); alula.name = 'thumb-alula-' + side;
      var alulaStart = [side * 0.324, 0.055, -0.133];
      alula.position.set(alulaStart[0] - wristOffset.x, alulaStart[1] - wristOffset.y, alulaStart[2] - wristOffset.z); wrist.add(alula);
      var thumbFeathers = batch();
      for (var thumb = 0; thumb < 3; thumb++) {
        appendFeather(thumbFeathers, [alulaStart[0] + side * thumb * 0.006, alulaStart[1], alulaStart[2]],
          [alulaStart[0] + side * (0.054 + thumb * 0.006), alulaStart[1] + 0.002, alulaStart[2] - 0.009 + thumb * 0.010],
          0.0085, [0x62503c, 0x6e5640, 0x564631][thumb], 0.002, side);
      }
      rig.meshes.push(meshInJoint(alula, thumbFeathers, wingMaterial, 'three-thumb-feathers', new THREE.Vector3(alulaStart[0], alulaStart[1], alulaStart[2]), side));
      rig.alula = alula;
      // Eight primaries overlap at their roots and separate toward their tips.
      for (var primary = 0; primary < 8; primary++) {
        var t = primary / 7;
        var start = [side * (0.433 + t * 0.034), 0.052, -0.071 + t * 0.135];
        var end = [side * (0.605 + Math.sin(t * Math.PI) * 0.017 - t * 0.105), 0.064 + Math.sin(t * Math.PI) * 0.008, -0.09 + t * 0.265];
        var pivot = new THREE.Group(); pivot.name = 'primary-quill-' + primary;
        pivot.position.set(start[0] - wristOffset.x, start[1] - wristOffset.y, start[2] - wristOffset.z); wrist.add(pivot);
        var feather = batch(); appendFeather(feather, start, end, 0.022 - t * 0.004, [0x453e33,0x514638,0x4b4235][primary % 3], 0.008, side);
        var mesh = meshInJoint(pivot, feather, primaryMaterial, 'slotted-primary-' + primary, new THREE.Vector3(start[0], start[1], start[2]), side);
        addPrimaryFlex(mesh); pivot.userData.vane = mesh;
        rig.meshes.push(mesh); rig.primaries.push(pivot);
      }
      wings.push(rig);
    });

    var tail = new THREE.Group(); tail.name = 'twelve-feather-rust-tail'; tail.position.set(0, -0.012, 0.172); upperBody.add(tail);
    for (var tf = 0; tf < 12; tf++) {
      var across = (tf / 11 - 0.5) * 2, tb = batch();
      appendFeather(tb, [0, 0, 0], [0, -0.005, 0.184 - Math.abs(across) * 0.012], 0.0185, 0xffffff, 0.004);
      var tm = addMesh(tail, finishBatch(tb), tailMaterial, 'rectrix-' + (tf + 1));
      tm.position.set(across * 0.019, (1 - Math.abs(across)) * 0.001, -Math.abs(across) * 0.006);
      tailFeathers.push({ mesh: tm, across: across });
    }

    var legMat = material({ color: 0xaa8a4b, roughness: 0.9, morphTargets: true, morphNormals: true }), clawMat = material({ color: 0x37332c, roughness: 0.49 });
    var legPlumeMat = material({ color: 0xd0c2a6, map: contour, bumpMap: contour, bumpScale: 0.0009, roughness: 0.98 });
    function tube(parent, points, radius, m, name) {
      var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
      return addMesh(parent, geometry(new THREE.TubeGeometry(curve, 12, radius, 7, false)), m, name);
    }
    [-1, 1].forEach(function (side) {
      var foot = new THREE.Group(); foot.name = 'anatomical-foot-' + side; foot.position.set(side * 0.044, -0.068, 0.012); root.add(foot);
      foot.userData.side = side; foot.userData.digits = [];
      var legPlume = addMesh(foot, eyeGeo, legPlumeMat, 'feathered-upper-leg-' + side); legPlume.position.set(0, -0.008, 0.004); legPlume.scale.set(0.017, 0.046, 0.022);
      var leg = tube(foot, [[0,0,0],[0,-0.028,0.013],[0,-0.070,0.007],[0,-0.099,-0.005]], 0.0065, legMat, 'tarsus');
      var bentPositions = leg.geometry.attributes.position.clone(), legUV = leg.geometry.attributes.uv;
      for (var legVertex = 0; legVertex < bentPositions.count; legVertex++) {
        var alongLeg = legUV.getX(legVertex), hipWeight = Math.pow(1 - alongLeg, 2);
        bentPositions.setY(legVertex, bentPositions.getY(legVertex) - hipWeight * 0.030);
        bentPositions.setZ(legVertex, bentPositions.getZ(legVertex) + Math.sin(alongLeg * Math.PI) * 0.010);
      }
      var bentLeg = new THREE.BufferGeometry(); bentLeg.setAttribute('position', bentPositions); bentLeg.setIndex(leg.geometry.index.clone()); bentLeg.computeVertexNormals();
      leg.geometry.morphAttributes.position = [bentLeg.attributes.position]; leg.geometry.morphAttributes.normal = [bentLeg.attributes.normal];
      bentLeg.dispose(); leg.updateMorphTargets(); foot.userData.leg = leg; foot.userData.plume = legPlume;
      [-0.63, 0, 0.63, Math.PI].forEach(function (angle, digit) {
        var length = [0.036,0.049,0.037,0.031][digit];
        var toe = new THREE.Group(); toe.name = 'articulated-digit-' + digit; toe.position.set(0, -0.096, -0.005); toe.rotation.y = -angle; foot.add(toe);
        foot.userData.digits.push({ joint: toe, angle: angle, back: digit === 3 });
        tube(toe, [[0,0,0],[0,-0.009,-length*0.4],[0,-0.013,-length]], 0.0037, legMat, 'toe-' + digit);
        tube(toe, [[0,-0.013,-length],[0,-0.012,-length*1.17],[0,-0.019,-length*1.30]], 0.0019, clawMat, 'curved-talon-' + digit);
      });
      feet.push(foot);
    });

    function strokeCycle(phase) { return ((phase / (Math.PI * 2) + 0.21) % 1 + 1) % 1; }
    function strokeAt(phase) {
      var cycle = strokeCycle(phase);
      return cycle < 0.42 ? Math.cos(Math.PI * cycle / 0.42) : -Math.cos(Math.PI * (cycle - 0.42) / 0.58);
    }
    var elapsed = 0, state = { fold: 1, headYaw: 0, gazePitch: 0, feet: 1, fan: 0.2 };
    function update(pose, dt) {
      if (disposed) return;
      pose = pose || {}; dt = clamp(Number(dt) || 0, 0, 0.1);
      elapsed = Number.isFinite(pose.elapsedTime) ? Math.max(0, pose.elapsedTime) : elapsed + dt;
      // Pose values are already continuous in the flight controller. Never
      // integrate the flap phase here: pausing stops every anatomical motion.
      var phase = Number(pose.flapPhase) || 0, amplitude = clamp(Number(pose.flapAmplitude) || 0, 0, 1);
      var fold = clamp(Number(pose.fold) || 0, 0, 1), open = 1 - fold;
      foldedPigment.value = smooth(0.2, 0.82, fold);
      var footExtension = clamp(Number(pose.feet) || 0, 0, 1);
      var crouch = clamp(Number(pose.crouch) || 0, 0, 1), touchdown = clamp(Number(pose.touchdown) || 0, 0, 1);
      var brake = clamp(Number(pose.brake) || 0, 0, 1), grip = Number.isFinite(pose.grip) ? clamp(pose.grip, 0, 1) : 1;
      var compression = Math.max(crouch, touchdown * 0.85) * footExtension;
      var fan = Math.max(clamp(Number(pose.tailFan) || 0, 0, 1), brake * 0.88);
      // Compress the body and hocks above the planted feet; never translate
      // the foot pads or root to fake the preparatory crouch or landing impact.
      var recoil = strokeAt(phase - 0.3) * amplitude * open * 0.0023;
      upperBody.rotation.x = fold * 0.53 - compression * 0.15;
      upperBody.position.y = -fold * 0.008 - compression * 0.030 + recoil;
      // The controller already eases its look-and-hold targets. Sampling them
      // directly keeps a scrubbed pose identical to playback at the same time.
      state.headYaw = clamp(Number(pose.headYaw) || 0, -0.8, 0.8);
      state.gazePitch = clamp(Number(pose.gazePitch) || 0, -0.3, 0.5);
      // The loaded downstroke occupies 42% of a cycle; the longer recovery
      // folds and twists at the wrist. Both turnarounds have zero velocity.
      var stroke = strokeAt(phase) * 0.82, wristStroke = strokeAt(phase - 0.38) * 0.38;
      var cycle = strokeCycle(phase), recoveryPhase = clamp((cycle - 0.42) / 0.58, 0, 1);
      var recovery = smooth(0, 0.18, recoveryPhase) * (1 - smooth(0.82, 1, recoveryPhase));
      var glideLoad = (1 - amplitude) * open;
      // Shared airflow comes from the same continuous field that moves the
      // habitat. Positive lift loads both wings; positive roll loads the
      // right wing more. No independent flutter clock or frame history.
      var airLift = clamp(Number(pose.airLift) || 0, -1, 1);
      var airRoll = clamp(Number(pose.airRoll) || 0, -1, 1);
      wings.forEach(function (wing) {
        var side = wing.side;
        var airLoad = (airLift * 0.010 + side * airRoll * 0.006) * glideLoad;
        wing.shoulder.rotation.z = side * ((0.075 + stroke * amplitude + brake * 0.16) * open + airLoad);
        wing.shoulder.rotation.y = -side * amplitude * recovery * 0.11 * open;
        wing.shoulder.rotation.x = (brake * 0.20 + recovery * amplitude * 0.065) * open;
        wing.wrist.rotation.z = side * (wristStroke * amplitude * open + airLoad * 0.65);
        wing.wrist.rotation.y = -side * (recovery * amplitude * 0.34 + brake * 0.08) * open;
        wing.wrist.rotation.x = (recovery * amplitude * 0.20 - (1 - recovery) * amplitude * 0.035 + brake * 0.12) * open +
          (airLift * 0.010 + side * airRoll * 0.004) * glideLoad;
        wing.alula.rotation.z = side * Math.max(clamp(Number(pose.alula) || 0, 0, 1), brake * 0.85) * 0.42 * open;
        wing.meshes.forEach(function (mesh) { mesh.morphTargetInfluences[0] = fold; });
        wing.primaries.forEach(function (primary, i) {
          var tipLoad = clamp(Number(pose.bank) || 0, -1, 1) * side * (0.016 + i * 0.003);
          var tipResponse = 1 - i * 0.045;
          primary.rotation.z = side * (strokeAt(phase - 0.62 - i * 0.032) * amplitude * 0.09 + tipLoad) * open + side * airLoad * tipResponse * 0.35;
          primary.rotation.x = (Math.sin(phase - 0.52) * amplitude * 0.105 + (i - 3.5) * 0.007 + tipLoad * 0.35) * open;
          var loadCycle = strokeCycle(phase - 0.16 - i * 0.025);
          var pressure = loadCycle < 0.42 ? Math.sin(Math.PI * loadCycle / 0.42) : -Math.sin(Math.PI * (loadCycle - 0.42) / 0.58) * 0.16;
          primary.userData.vane.morphTargetInfluences[1] = (pressure * amplitude * 0.72 +
            (airLift * 0.14 + side * airRoll * 0.06) * glideLoad * tipResponse + tipLoad * 2.0) * open;
        });
      });
      // Tail extends along +Z: positive X lowers its tip during braking.
      tail.rotation.x = -0.06 - fan * 0.11 + brake * 0.42 + strokeAt(phase - 0.65) * amplitude * 0.025 * open + airLift * 0.021 * glideLoad;
      tail.rotation.z = clamp(Number(pose.bank) || 0, -1, 1) * -0.18 - airRoll * 0.028 * glideLoad;
      tail.rotation.y = clamp(Number(pose.bank) || 0, -1, 1) * 0.065 * open + airRoll * 0.012 * glideLoad;
      tailFeathers.forEach(function (feather) {
        feather.mesh.rotation.y = feather.across * (0.045 + fan * 0.40);
        feather.mesh.rotation.x = Math.abs(feather.across) * fan * 0.022 + strokeAt(phase - 0.8 - Math.abs(feather.across) * 0.12) * amplitude * open * 0.012 +
          (airLift * 0.010 * (0.3 + Math.abs(feather.across) * 0.7) + airRoll * feather.across * 0.006) * glideLoad;
      });
      // The hocks lift and draw forwards into the belly. Rotation alone left
      // the yellow toes hanging in the airflow, especially on a shallow glide.
      var tuck = smooth(0, 1, 1 - footExtension);
      feet.forEach(function (foot) {
        foot.rotation.x = -tuck * 1.94; foot.rotation.z = -foot.userData.side * tuck * 0.08;
        foot.position.y = -0.068 + tuck * 0.035; foot.position.z = 0.012 - tuck * 0.050;
        foot.userData.leg.morphTargetInfluences[0] = compression;
        foot.userData.plume.position.y = -0.008 - compression * 0.030;
        foot.userData.plume.position.z = 0.004 + compression * 0.004;
        foot.userData.digits.forEach(function (digit) {
          // Airborne feet curl regardless of grip; extended toes splay open
          // before contact, then close laterally around the perch. Rotation
          // about Y preserves every toe's vertical contact coordinate.
          digit.joint.rotation.x = tuck * (digit.back ? 0.68 : 1.06);
          var spread = digit.back ? 1 : (1 - tuck * 0.26) * (1 + (1 - grip) * (1 - tuck) * 0.40);
          digit.joint.rotation.y = -digit.angle * spread;
        });
      });
      head.rotation.y = clamp(state.headYaw, -0.8, 0.8);
      head.rotation.x = -clamp(Number(pose.pitch) || 0, -0.6, 0.6) * 0.68 - upperBody.rotation.x * 0.58 - state.gazePitch;
      head.rotation.z = -clamp(Number(pose.bank) || 0, -1, 1) * 0.48 * open;
      head.position.y = 0.068 + compression * 0.006 - recoil * 0.60;
      head.position.z = -0.202 - compression * 0.005;
      var breath = Number.isFinite(pose.breath) ? pose.breath : (Math.sin(elapsed * 2.1) + 1) * 0.5;
      torso.scale.y = 1 + clamp(breath, 0, 1) * 0.006 * fold;
      // A short, occasional blink; its clock advances only while update runs.
      var blinkPhase = elapsed % 8.4, blink = 1 - smooth(7.92, 7.98, blinkPhase) * (1 - smooth(8.04, 8.11, blinkPhase));
      eyes.forEach(function (eye) { eye.scale.y = Math.max(0.08, blink); });
      state.fold = fold; state.feet = footExtension; state.fan = fan;
    }
    function dispose() {
      if (disposed) return; disposed = true;
      geometries.forEach(function (g) { g.dispose(); }); materials.forEach(function (m) { m.dispose(); }); textures.forEach(function (t) { t.dispose(); });
      if (root.parent) root.parent.remove(root);
    }
    root.userData.featherCount = featherCount;
    root.userData.joints = ['shoulders', 'wrists', 'alulae', 'sixteen-primary-quills', 'tail-fan', 'head', 'hocks', 'eight-toes'];
    update({ fold: 1, feet: 1, tailFan: 0.15 }, 0);
    return { root: root, update: update, dispose: dispose, footOffsetY: -0.185,
      joints: { wings: wings, head: head, tail: tail, feet: feet },
      getStats: function () { return { feathers: featherCount, geometries: geometries.length, materials: materials.length, textures: textures.length, wingspanMetres: 1.24, fold: state.fold }; } };
  }
  global.BirdLab3DBird = { create: create, version: '1.7.0' };
})(typeof window !== 'undefined' ? window : globalThis);
