/* BirdLab 3D red-tailed hawk.
 * Feather painting, cambered wing surfaces, rooted feather flex and closed-wing
 * morphs are adapted from the procedural raptor in stem_tool_raptorhunt.js.
 * Three r128; no asset requests. Coordinates: forward -Z, dorsal +Y, metres.
 */
(function (global) {
  'use strict';

  function create(THREE) {
    var featherArt = global.AvianFeatherArt;
    if (!featherArt || typeof featherArt.createFlightFeatherCanvas !== 'function' || typeof featherArt.createVaneDetailCanvases !== 'function' ||
        typeof featherArt.applyVaneGrain !== 'function' || typeof featherArt.vaneGrainCacheKey !== 'function') {
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
    function smoothSphereNormals(g) {
      // Deformed spheres retain duplicate vertices at the UV seam and poles.
      // Share their area-weighted face normals without welding the geometry,
      // so texture coordinates, pigment and the sculpted silhouette stay put.
      g.computeVertexNormals();
      var p = g.attributes.position, n = g.attributes.normal, index = g.index;
      var groups = Object.create(null), keys = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (var i = 0; i < p.count; i++) {
        // The tiny tolerance absorbs sin(2*pi) roundoff at coincident points.
        var key = Math.round(p.getX(i) * 1e8) + ',' + Math.round(p.getY(i) * 1e8) + ',' + Math.round(p.getZ(i) * 1e8);
        keys.push(key);
        if (!groups[key]) groups[key] = { count: 0, normal: new THREE.Vector3() };
        groups[key].count++;
      }
      for (var face = 0; face < index.count; face += 3) {
        var ia = index.getX(face), ib = index.getX(face + 1), ic = index.getX(face + 2);
        a.fromBufferAttribute(p, ia); b.fromBufferAttribute(p, ib); c.fromBufferAttribute(p, ic);
        b.sub(a).cross(c.sub(a));
        groups[keys[ia]].normal.add(b); groups[keys[ib]].normal.add(b); groups[keys[ic]].normal.add(b);
      }
      Object.keys(groups).forEach(function (key) { if (groups[key].count > 1) groups[key].normal.normalize(); });
      for (var i = 0; i < p.count; i++) {
        var group = groups[keys[i]];
        if (group.count > 1) n.setXYZ(i, group.normal.x, group.normal.y, group.normal.z);
      }
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
    // The atlas supplies sub-millimetre relief. Broader, feather-local barb
    // bundles and quiet worn margins remain legible as the atlas mipmaps out.
    // Filter each frequency in screen space so moving vanes do not shimmer.
    function vaneGrain(shader, contourFeather) {
      featherArt.applyVaneGrain(shader, { variants: 4, contourFeather: contourFeather });
    }
    function featherMaterial(color, map) {
      var m = material({ color: color, map: map || vane, normalMap: vaneNormal, normalScale: new THREE.Vector2(0.36, 0.36),
        roughnessMap: vaneRough, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, vertexColors: true, morphTargets: true, morphNormals: true });
      m.extensions = { derivatives: true };
      m.onBeforeCompile = function (shader) { vaneGrain(shader, false); };
      m.customProgramCacheKey = function () { return featherArt.vaneGrainCacheKey({ variants: 4 }); };
      return m;
    }
    var wingMaterial = featherMaterial(0xffffff), primaryMaterial = featherMaterial(0xffffff);
    var tailMaterial = featherMaterial(0xb86b42, tailTexture);
    var contourVane = texture(unbarredVaneArt, 'hawk-unbarred-contour-vane');
    var contourMaterial = featherMaterial(0xffffff, contourVane);
    contourMaterial.onBeforeCompile = function (shader) { vaneGrain(shader, true); };
    contourMaterial.customProgramCacheKey = function () { return featherArt.vaneGrainCacheKey({ variants: 4, contourFeather: true }); };
    // The same surface is brown above and buff below. Its pigmentation follows
    // the mesh through flapping/folding; there are no floating marking decals.
    var foldedPigment = { value: 1 };
    function underwing(m, dark) {
      m.extensions = { derivatives: true };
      m.onBeforeCompile = function (shader) {
        shader.uniforms.blFoldedPigment = foldedPigment;
        shader.uniforms.blCovertMap = { value: contourVane };
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 birdWingCoord;\nattribute vec2 birdFeatherStyle;\nvarying vec2 vBirdWingCoord;\nvarying vec2 vBirdFeatherStyle;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBirdWingCoord=birdWingCoord;\nvBirdFeatherStyle=birdFeatherStyle;');
        shader.fragmentShader = 'uniform float blFoldedPigment;\nuniform sampler2D blCovertMap;\nvarying vec2 vBirdWingCoord;\nvarying vec2 vBirdFeatherStyle;\n' + shader.fragmentShader;
        // Small coverts have quiet, unbarred vanes. Reuse the existing atlas
        // in the same batch; their feather-local markings follow every fold.
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace(
          'texture2D( map, vUv )', 'mix(texture2D(map,vUv),texture2D(blCovertMap,vUv),vBirdFeatherStyle.x)'));
        // These coordinates belong to the fully spread, authored wing. They
        // are interpolated on the same vertices through both wing morphs, so
        // the pigment never slides when a wrist bends or a wing folds.
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + [
          'if (vBirdFeatherStyle.x>0.5) {',
          '  float shaft=1.0-vUv.y,across=abs(fract(vUv.x*4.0)-0.5)*2.0;',
          '  float vaneAA=max(fwidth(shaft),0.004),crossAA=max(fwidth(across),0.015);',
          '  float tipStart=0.78+vBirdFeatherStyle.y*0.07;',
          '  float tipWave=sin(across*8.0+vBirdFeatherStyle.y*12.0)*0.018;',
          '  float tipAA=max(fwidth(shaft-tipWave),vaneAA);',
          '  float fringe=smoothstep(tipStart+tipWave-tipAA,0.995+tipAA,shaft)*(0.22+vBirdFeatherStyle.y*0.10);',
          '  float margin=smoothstep(0.78-crossAA,1.0+crossAA,across)*smoothstep(0.26,0.68,shaft)*(0.09+vBirdFeatherStyle.y*0.06);',
          '  float center=(1.0-smoothstep(0.10-crossAA,0.38+crossAA,across))*smoothstep(0.10,0.30,shaft)*(1.0-smoothstep(0.76,0.96,shaft));',
          '  diffuseColor.rgb*=1.0-center*(0.11+vBirdFeatherStyle.y*0.07);',
          '  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.43,0.32,0.20)*texelColor.rgb,max(fringe,margin));',
          '}',
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
        vaneGrain(shader, false);
      };
      m.customProgramCacheKey = function () { return 'birdlab-underwing-covert-markings-v5-' + dark + '|' + featherArt.vaneGrainCacheKey({ variants: 4 }); };
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
    bodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); smoothSphereNormals(bodyGeo);
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
    // Keep the skin and its short overlying feathers on the same sculpted
    // surface. Lift is measured along the original ellipsoid's radial axis;
    // eye, brow and bill landmarks stay in their authored positions.
    function headSurface(hx, hy, hz, lift) {
      var cheek = smooth(-0.35, -0.9, hy);
      var forehead = smooth(-0.18, -0.85, hz) * smooth(-0.12, 0.72, hy);
      return [hx * 0.059 * (1 - cheek * 0.31) + hx * lift,
        hy * 0.058 - smooth(0.20, 1, hy) * 0.017 + cheek * 0.018 - forehead * 0.005 + hy * lift,
        hz * 0.076 - Math.max(0, hy) * 0.009 + cheek * 0.007 + hz * lift];
    }
    var headGeo = geometry(new THREE.SphereGeometry(1, 36, 26)), hp = headGeo.attributes.position, hc = [];
    for (var hi = 0; hi < hp.count; hi++) {
      var hx = hp.getX(hi), hy = hp.getY(hi), hz = hp.getZ(hi);
      var headPoint = headSurface(hx, hy, hz, 0);
      hp.setXYZ(hi, headPoint[0], headPoint[1], headPoint[2]);
      shade.copy(dorsal).lerp(breast, (1 - smooth(-0.64, 0.14, hy)) * (1 - smooth(0.0, 0.7, hz)) * 0.73);
      hc.push(shade.r, shade.g, shade.b);
    }
    headGeo.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3)); smoothSphereNormals(headGeo);
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
    var eyes = [], eyelids = [], blinkClosure = { value: 0 };
    // The lower lid travels over a fixed globe. Its curved surface is sampled
    // in the vertex shader, so the iris and pupil keep their shape during a
    // blink and no vertex buffers need rebuilding in the animation loop.
    var lidGeometry = geometry(new THREE.PlaneGeometry(1, 1, 24, 14));
    // Keep CPU bounds/inspection in metres too; the shader uses these UVs
    // to move only the lid's leading edge over the same ellipsoid.
    for (var lidVertex = 0; lidVertex < lidGeometry.attributes.position.count; lidVertex++) {
      var lidUV = lidGeometry.attributes.uv, lidY = -0.0079 + 0.0158 * lidUV.getY(lidVertex);
      var lidSpan = Math.sqrt(Math.max(0.000001, 1 - lidY * lidY / (0.0080 * 0.0080)));
      var lidX = (lidUV.getX(lidVertex) * 2 - 1) * 0.0094 * lidSpan;
      var lidZ = 0.0004 + 0.0062 * Math.sqrt(Math.max(0.000001, 1 - lidX * lidX / (0.0094 * 0.0094) - lidY * lidY / (0.0080 * 0.0080)));
      lidGeometry.attributes.position.setXYZ(lidVertex, lidX, lidY, lidZ);
    }
    lidGeometry.computeVertexNormals();
    lidGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0.003), 0.014);
    var lidMat = material({ color: 0x71654e, roughness: 0.96, side: THREE.DoubleSide });
    lidMat.onBeforeCompile = function (shader) {
      shader.uniforms.blBlinkClosure = blinkClosure;
      shader.vertexShader = 'uniform float blBlinkClosure;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', [
        'float lidY=mix(-0.0079,mix(-0.0077,0.0079,blBlinkClosure),uv.y);',
        'float lidSpan=sqrt(max(0.000001,1.0-lidY*lidY/(0.0080*0.0080)));',
        'float lidX=(uv.x*2.0-1.0)*0.0094*lidSpan;',
        'float lidZ=0.0004+0.0062*sqrt(max(0.000001,1.0-lidX*lidX/(0.0094*0.0094)-lidY*lidY/(0.0080*0.0080)));',
        'vec3 objectNormal=normalize(vec3(lidX/(0.0094*0.0094),lidY/(0.0080*0.0080),(lidZ-0.0004)/(0.0062*0.0062)));'
      ].join('\n'));
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed=vec3(lidX,lidY,lidZ);');
    };
    lidMat.customProgramCacheKey = function () { return 'birdlab-curved-lower-eyelid-v1'; };
    [-1, 1].forEach(function (side) {
      var normal = new THREE.Vector3(side * 0.86, 0.14, -0.50).normalize();
      var eyeRig = new THREE.Group(); eyeRig.name = 'hawk-eye-' + side;
      eyeRig.position.set(side * 0.052, 0.015, -0.039); eyeRig.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); head.add(eyeRig); eyes.push(eyeRig);
      var orbit = addMesh(eyeRig, eyeGeo, orbitMat, 'fine-orbital-rim'); orbit.scale.set(0.0094, 0.0080, 0.003);
      var iris = addMesh(eyeRig, eyeGeo, irisMat, 'amber-iris'); iris.scale.set(0.0072, 0.0066, 0.0028); iris.position.z = 0.0019;
      var pupil = addMesh(eyeRig, eyeGeo, pupilMat, 'small-pupil'); pupil.scale.set(0.0042, 0.0043, 0.0017); pupil.position.z = 0.0041;
      var lid = addMesh(eyeRig, lidGeometry, lidMat, 'curved-lower-eyelid');
      lid.castShadow = false; lid.receiveShadow = false; lid.visible = false; eyelids.push(lid);
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
    // Sweep the keratin around a turning centerline. Rings follow the curve
    // into the hook instead of pinching across fixed planes near the tip.
    // Keep the original root, tip and facial attachment inside their bounds.
    var billP = [], billUV = [], billI = [];
    var sections = [[-0.057,-0.006,0.024,0.016],[-0.077,-0.008,0.018,0.014],[-0.094,-0.012,0.010,0.010],[-0.102,-0.022,0.005,0.005],[-0.106,-0.039,0.0008,0.0015]];
    var billTangents = sections.map(function (s, index) {
      return s.map(function (value, component) {
        if (index === 0) return sections[1][component] - value;
        if (index === sections.length - 1) return value - sections[index - 1][component];
        var before = value - sections[index - 1][component], after = sections[index + 1][component] - value;
        return before * after > 0 ? 2 * before * after / (before + after) : 0;
      });
    });
    billTangents[0][1] = 0; // The concealed attachment remains in its original plane.
    var billSamples = [], billFrames = [], billDistance = [0], billRadial = 24, billStride = billRadial + 1;
    for (var billRow = 0; billRow <= 24; billRow++) {
      var billSegment = Math.min(3, Math.floor(billRow / 6)), billT = billRow / 6 - billSegment;
      var billT2 = billT * billT, billT3 = billT2 * billT;
      var sample = sections[billSegment].map(function (value, component) {
        return (2 * billT3 - 3 * billT2 + 1) * value + (billT3 - 2 * billT2 + billT) * billTangents[billSegment][component] +
          (-2 * billT3 + 3 * billT2) * sections[billSegment + 1][component] + (billT3 - billT2) * billTangents[billSegment + 1][component];
      });
      var billDZ = (6 * billT2 - 6 * billT) * sections[billSegment][0] + (3 * billT2 - 4 * billT + 1) * billTangents[billSegment][0] +
        (-6 * billT2 + 6 * billT) * sections[billSegment + 1][0] + (3 * billT2 - 2 * billT) * billTangents[billSegment + 1][0];
      var billDY = (6 * billT2 - 6 * billT) * sections[billSegment][1] + (3 * billT2 - 4 * billT + 1) * billTangents[billSegment][1] +
        (-6 * billT2 + 6 * billT) * sections[billSegment + 1][1] + (3 * billT2 - 2 * billT) * billTangents[billSegment + 1][1];
      var billSpeed = Math.hypot(billDZ, billDY);
      billFrames.push([-billDZ / billSpeed, billDY / billSpeed]);
      billSamples.push(sample);
      if (billRow) billDistance.push(billDistance[billRow - 1] + Math.hypot(sample[0] - billSamples[billRow - 1][0], sample[1] - billSamples[billRow - 1][1]));
    }
    var billTip = [0, sections[4][1] + billFrames[24][1] * 0.001, sections[4][0] - billFrames[24][0] * 0.001];
    var billLength = billDistance[24] + 0.001;
    billSamples.forEach(function (s, row) {
      for (var j = 0; j <= billRadial; j++) {
        // Duplicate the hidden underside seam for UV wrapping. Its two
        // positions are identical, and their shading normals are welded below.
        var a = (j === billRadial ? 0 : j / billRadial) * Math.PI * 2 - Math.PI / 2;
        billP.push(Math.cos(a) * s[2], s[1] + Math.sin(a) * s[3] * billFrames[row][0], s[0] + Math.sin(a) * s[3] * billFrames[row][1]);
        billUV.push(j / billRadial, billDistance[row] / billLength);
        if (row < 24 && j < billRadial) {
          var a0 = row * billStride + j, a1 = a0 + 1;
          billI.push(a0, a0 + billStride, a1, a1, a0 + billStride, a1 + billStride);
        }
      }
    });
    // A minute rounded end closes the keratin surface; the hidden root ring
    // remains embedded in the cere, whose position and proportions are intact.
    var billTipIndex = billP.length / 3; billP.push(billTip[0], billTip[1], billTip[2]); billUV.push(0.5, 1);
    for (var billCap = 0; billCap < billRadial; billCap++) billI.push(24 * billStride + billCap, billTipIndex, 24 * billStride + billCap + 1);
    var billGeo = geometry(new THREE.BufferGeometry()); billGeo.setAttribute('position', new THREE.Float32BufferAttribute(billP, 3)); billGeo.setAttribute('uv', new THREE.Float32BufferAttribute(billUV, 2)); billGeo.setIndex(billI); billGeo.computeVertexNormals();
    var billNormals = billGeo.attributes.normal, billSeamNormal = new THREE.Vector3();
    for (var billSeam = 0; billSeam <= 24; billSeam++) {
      var billFirst = billSeam * billStride, billLast = billFirst + billRadial;
      billSeamNormal.set(billNormals.getX(billFirst) + billNormals.getX(billLast), billNormals.getY(billFirst) + billNormals.getY(billLast), billNormals.getZ(billFirst) + billNormals.getZ(billLast)).normalize();
      billNormals.setXYZ(billFirst, billSeamNormal.x, billSeamNormal.y, billSeamNormal.z);
      billNormals.setXYZ(billLast, billSeamNormal.x, billSeamNormal.y, billSeamNormal.z);
    }
    addMesh(head, billGeo, billMat, 'curved-keratin-hook');
    [-1, 1].forEach(function (side) {
      var nostril = addMesh(head, eyeGeo, orbitMat, 'nostril-' + side); nostril.position.set(side * 0.0203, -0.005, -0.068); nostril.scale.set(0.0012, 0.0025, 0.0035);
    });

    function batch() { return { p: [], uv: [], c: [], i: [], style: [] }; }
    // Shared curved vane construction: seven stations and a ridge down the
    // shaft. Layered vanes are batched, while slotted tips keep quill pivots.
    function appendFeather(b, start, end, width, color, camber, handedness, covertSeed) {
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
          // A fine physical shaft breaks up the broad plate-like highlight
          // on small coverts. Existing columns carry the crest; roots, tips
          // and edges stay attached, with no extra vertices or moving decal.
          var shaftCrest = covertSeed === undefined ? 0 : (0.00022 + covertSeed * 0.00016) *
            Math.pow(Math.sin(t * Math.PI), 2) * Math.pow(1 - Math.abs(cross), 3.6);
          b.p.push(start[0] + dx * t + acrossX * cross * width * widths[row] * asymmetric,
            start[1] + (end[1] - start[1]) * t + bend * (1 - cross * cross * 0.55) + shaftCrest,
            start[2] + dz * t + acrossZ * cross * width * widths[row] * asymmetric);
          b.uv.push((vaneVariant + 0.008 + col / 4 * 0.984) / 4, 1 - t);
          b.style.push(covertSeed === undefined ? 0 : 1, covertSeed === undefined ? 0 : covertSeed);
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
    // Crown feathers run back toward the nape rather than radiating as a
    // crest. Only their free tips lift from the head, adding a fine broken
    // silhouette while leaving the eyes, brow and cere unobstructed. One
    // batch shares the mantle's unbarred vane material and detail textures.
    var crownFeathers = batch(), crownRows = [0, 0.18, 0.40, 0.62, 0.81, 0.95, 1];
    for (var crownRow = 0; crownRow < 7; crownRow++) {
      var crownExtent = [0.65, 0.80, 1.32, 1.72, 1.84, 1.90, 1.94][crownRow];
      for (var crownLane = 0; crownLane < 17; crownLane++) {
        var crownAngle = (crownLane - 8 + (crownRow % 2) * 0.35) * crownExtent / 8;
        var crownStart = -0.70 + crownRow * 0.23 + (noise(crownRow + 103, crownLane) - 0.5) * 0.016;
        var crownLength = 0.255 + noise(crownLane + 67, crownRow) * 0.032;
        var crownBase = crownFeathers.p.length / 3;
        var crownTint = new THREE.Color([0x624b38, 0x674e3b, 0x604938, 0x6a513e][(crownRow + crownLane) % 4]).convertSRGBToLinear();
        var crownVariant = Math.floor(noise(crownRow + 59, crownLane + 31) * 4);
        featherCount++;
        for (var crownStation = 0; crownStation < crownRows.length; crownStation++) {
          var crownT = crownRows[crownStation], crownTip = [0.64, 0.90, 1, 0.93, 0.73, 0.30, 0.025][crownStation];
          var crownZ = crownStart + crownLength * crownT;
          var crownRadius = Math.sqrt(Math.max(0.001, 1 - crownZ * crownZ));
          for (var crownCross = 0; crownCross < 5; crownCross++) {
            var crownAcross = crownCross / 2 - 1;
            var crownA = crownAngle + crownAcross * crownTip * crownExtent * 0.088;
            var crownLift = 0.00022 + Math.sin(crownT * Math.PI) * 0.00036 + Math.pow(crownT, 3) * 0.00065 + (1 - crownAcross * crownAcross) * crownTip * 0.00020;
            var crownPoint = headSurface(Math.sin(crownA) * crownRadius, Math.cos(crownA) * crownRadius, crownZ, crownLift);
            crownFeathers.p.push(crownPoint[0], crownPoint[1], crownPoint[2]);
            crownFeathers.uv.push((crownVariant + 0.008 + crownCross / 4 * 0.984) / 4, 1 - crownT);
            var crownEdge = 0.97 + Math.pow(crownT, 5) * 0.10 + (1 - Math.abs(crownAcross)) * 0.018;
            crownFeathers.c.push(crownTint.r * crownEdge, crownTint.g * crownEdge, crownTint.b * crownEdge);
            if (crownStation < crownRows.length - 1 && crownCross < 4) {
              var crownVertex = crownBase + crownStation * 5 + crownCross;
              crownFeathers.i.push(crownVertex, crownVertex + 5, crownVertex + 1, crownVertex + 1, crownVertex + 5, crownVertex + 6);
            }
          }
        }
      }
    }
    addMesh(head, finishBatch(crownFeathers), contourMaterial, 'layered-crown-and-nape-plumes');
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
    // Short, closely shingled breast feathers wrap the underside. These are
    // finer than the long scapulars above, with subdued individual tip lift
    // rather than broad, evenly spaced scales across the chest.
    var breastFeathers = batch();
    for (var breastRow = 0; breastRow < 12; breastRow++) {
      for (var breastLane = 0; breastLane < 25; breastLane++) {
        var breastAngle = Math.PI + (breastLane - 12 + (breastRow % 2) * 0.5) * 0.13;
        var breastStart = -0.173 + breastRow * 0.0235 + (noise(breastRow + 91, breastLane) - 0.5) * 0.003;
        var breastLength = 0.033 + noise(breastLane + 57, breastRow) * 0.006;
        var breastLay = (noise(breastRow + 181, breastLane + 23) - 0.5) * 0.018;
        var breastLift = 0.82 + noise(breastLane + 71, breastRow + 67) * 0.30;
        var breastBase = breastFeathers.p.length / 3;
        var breastTint = new THREE.Color(0xd6cbb0).convertSRGBToLinear();
        breastTint.multiplyScalar(0.97 + noise(breastRow + 27, breastLane) * 0.055);
        var breastVariant = Math.floor(noise(breastRow + 11, breastLane + 43) * 4);
        featherCount++;
        for (var breastStation = 0; breastStation < contourRows.length; breastStation++) {
          var breastT = contourRows[breastStation], breastTip = [0.66, 0.90, 1, 0.93, 0.73, 0.30, 0.025][breastStation];
          for (var breastCross = 0; breastCross < 5; breastCross++) {
            var breastAcross = breastCross / 2 - 1;
            var breastPoint = contourPoint(breastStart + breastLength * breastT,
              breastAngle + breastAcross * breastTip * 0.087 + breastLay * breastT * breastT,
              0.00035 + (Math.sin(breastT * Math.PI) * 0.00048 + breastT * breastT * 0.00082) * breastLift + (1 - breastAcross * breastAcross) * 0.00022);
            breastFeathers.p.push(breastPoint[0], breastPoint[1], breastPoint[2]);
            breastFeathers.uv.push((breastVariant + 0.008 + breastCross / 4 * 0.984) / 4, 1 - breastT);
            var breastEdge = 0.99 + Math.pow(breastT, 5) * 0.035;
            breastFeathers.c.push(breastTint.r * breastEdge, breastTint.g * breastEdge, breastTint.b * breastEdge);
            if (breastStation < contourRows.length - 1 && breastCross < 4) {
              var breastVertex = breastBase + breastStation * 5 + breastCross;
              breastFeathers.i.push(breastVertex, breastVertex + 5, breastVertex + 1, breastVertex + 1, breastVertex + 5, breastVertex + 6);
            }
          }
        }
      }
    }
    var breastMaterial = featherMaterial(0xffffff, contourVane);
    // The belly band is anchored to body coordinates on both the skin and
    // the overlying plumes, so markings stay coherent between feather rows.
    var breastPigment = bodyMaterial.onBeforeCompile;
    breastMaterial.onBeforeCompile = function (shader) { breastPigment(shader); vaneGrain(shader, true); };
    breastMaterial.customProgramCacheKey = function () { return 'birdlab-hawk-breast-plumes-v3|' + featherArt.vaneGrainCacheKey({ variants: 4, contourFeather: true }); };
    addMesh(torso, finishBatch(breastFeathers), breastMaterial, 'layered-breast-and-belly-plumes');
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
      g.setAttribute('birdFeatherStyle', new THREE.Float32BufferAttribute(b.style, 2));
      addClosedMorph(g, offset, side);
      var mesh = addMesh(parent, g, m, name); mesh.updateMorphTargets(); return mesh;
    }
    function addPrimaryFlex(mesh) {
      var g = mesh.geometry, source = g.attributes.position, positions = source.clone(), uv = g.attributes.uv;
      // Curve each feather along its own shaft, shortening its projected
      // reach as it bends. A fixed Z offset stretched the aft fingers
      // instead of following each shaft. Author the loaded shape once;
      // playback only interpolates the retained morph and closed-wing shape.
      var centers = [], loaded = [];
      for (var row = 0; row < source.count; row += 5) {
        var center = new THREE.Vector3().fromBufferAttribute(source, row + 2);
        var along = 1 - uv.getY(row + 2), bent = center.clone(); bent.y += along * along * along * 0.020;
        if (row) {
          var previous = centers[centers.length - 1], previousBent = loaded[loaded.length - 1];
          var dx = center.x - previous.x, dz = center.z - previous.z, dy = center.y - previous.y;
          var bendDY = bent.y - previousBent.y, horizontal = Math.hypot(dx, dz);
          var reach = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - bendDY * bendDY));
          bent.x = previousBent.x + dx * reach / horizontal; bent.z = previousBent.z + dz * reach / horizontal;
        }
        centers.push(center); loaded.push(bent);
      }
      var oldTangent = new THREE.Vector3(), newTangent = new THREE.Vector3(), barb = new THREE.Vector3(), bendRotation = new THREE.Quaternion();
      for (var station = 1; station < centers.length; station++) {
        var before = station - 1, after = Math.min(station + 1, centers.length - 1);
        oldTangent.copy(centers[after]).sub(centers[before]).normalize();
        newTangent.copy(loaded[after]).sub(loaded[before]).normalize();
        bendRotation.setFromUnitVectors(oldTangent, newTangent);
        // Carry the vanes around the bending shaft instead of sliding their
        // edges vertically. The entire root row remains exactly anchored.
        for (var cross = 0; cross < 5; cross++) {
          var vertex = station * 5 + cross;
          barb.fromBufferAttribute(source, vertex).sub(centers[station]).applyQuaternion(bendRotation).add(loaded[station]);
          positions.setXYZ(vertex, barb.x, barb.y, barb.z);
        }
      }
      var curved = new THREE.BufferGeometry(); curved.setAttribute('position', positions); curved.setIndex(g.index.clone()); curved.computeVertexNormals();
      g.morphAttributes.position.push(curved.attributes.position); g.morphAttributes.normal.push(curved.attributes.normal);
      curved.dispose(); mesh.updateMorphTargets();
    }
    function makeCarpalBridge(mesh, wrist) {
      var g = mesh.geometry, positions = g.attributes.position, span = g.attributes.birdWingCoord;
      var weights = new Float32Array(positions.count);
      for (var vertex = 0; vertex < weights.length; vertex++) weights[vertex] = smooth(0.47, 0.65, span.getX(vertex));
      positions.setUsage(THREE.DynamicDrawUsage); g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      // The small belt keeps the original feather shapes and closed morph.
      // Its fixed endpoints follow the arm and hand; the middle bends across
      // the carpus instead of exposing a slit between two rigid feather fans.
      g.computeBoundingSphere(); g.boundingSphere.radius += 0.18;
      return { mesh: mesh, wrist: wrist, source: positions.array.slice(), closed: g.morphAttributes.position[0].array.slice(), weights: weights,
        previous: new THREE.Quaternion(), fold: 0 };
    }
    function updateCarpalBridge(wing, fold) {
      var bridge = wing.bridge, wrist = bridge.wrist;
      // Blend the authored closed shape before the joint bend, exactly as
      // the neighboring rigid meshes do. Leaving this blend on the GPU would
      // make the outer anchor detach again during a partly folded stroke.
      bridge.mesh.morphTargetInfluences[0] = 0;
      if (bridge.previous.equals(wrist.quaternion) && bridge.fold === fold) return;
      bridge.previous.copy(wrist.quaternion); bridge.fold = fold;
      var g = bridge.mesh.geometry, positions = g.attributes.position, normals = g.attributes.normal;
      var p = positions.array, n = normals.array, index = g.index.array, q = wrist.quaternion;
      var px = wrist.position.x, py = wrist.position.y, pz = wrist.position.z;
      for (var vertex = 0; vertex < positions.count; vertex++) {
        var offset = vertex * 3, weight = bridge.weights[vertex];
        var x = bridge.source[offset] * (1 - fold) + bridge.closed[offset] * fold - px;
        var y = bridge.source[offset + 1] * (1 - fold) + bridge.closed[offset + 1] * fold - py;
        var z = bridge.source[offset + 2] * (1 - fold) + bridge.closed[offset + 2] * fold - pz;
        // Normalized quaternion blending follows the modest wrist rotation
        // with a smooth bend and exact rigid endpoints, without
        // per-vertex trigonometry or temporary object allocations.
        var qx = q.x * weight, qy = q.y * weight, qz = q.z * weight, qw = 1 + (q.w - 1) * weight;
        var scale = 1 / Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
        qx *= scale; qy *= scale; qz *= scale; qw *= scale;
        var tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
        p[offset] = x + qw * tx + qy * tz - qz * ty + px;
        p[offset + 1] = y + qw * ty + qz * tx - qx * tz + py;
        p[offset + 2] = z + qw * tz + qx * ty - qy * tx + pz;
      }
      // Recompute the actual bent surface normals, including the changing
      // spanwise tangent. Rotating the old normals alone makes a hard crease.
      n.fill(0);
      for (var triangle = 0; triangle < index.length; triangle += 3) {
        var a = index[triangle] * 3, b = index[triangle + 1] * 3, c = index[triangle + 2] * 3;
        var ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        var vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        n[a] += nx; n[a + 1] += ny; n[a + 2] += nz;
        n[b] += nx; n[b + 1] += ny; n[b + 2] += nz;
        n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
      }
      for (var normal = 0; normal < n.length; normal += 3) {
        var length = Math.sqrt(n[normal] * n[normal] + n[normal + 1] * n[normal + 1] + n[normal + 2] * n[normal + 2]) || 1;
        n[normal] /= length; n[normal + 1] /= length; n[normal + 2] /= length;
      }
      positions.needsUpdate = true; normals.needsUpdate = true;
    }
    [-1, 1].forEach(function (side) {
      var shoulder = new THREE.Group(); shoulder.name = (side < 0 ? 'left' : 'right') + '-shoulder'; shoulder.position.set(side * 0.064, 0.025, -0.085); upperBody.add(shoulder);
      var wrist = new THREE.Group(); wrist.name = 'articulated-wrist'; wrist.position.set(side * 0.265, 0.013, -0.027); shoulder.add(wrist);
      var shoulderOffset = shoulder.position.clone(), wristOffset = shoulder.position.clone().add(wrist.position);
      var rig = { side: side, shoulder: shoulder, wrist: wrist, meshes: [], primaries: [] };
      var inner = batch(), outer = batch(), carpal = batch();
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
          appendFeather(u < 0.42 ? inner : u > 0.70 ? outer : carpal, start, end, 0.48 / count * 0.70, palette[(f + layer) % palette.length], 0.0025, side,
            layer ? noise(f + 41, layer + 83) : undefined);
        }
      }
      rig.meshes.push(meshInJoint(shoulder, inner, wingMaterial, 'layered-inner-wing-feathers', shoulderOffset, side));
      rig.meshes.push(meshInJoint(wrist, outer, wingMaterial, 'layered-outer-wing-feathers', wristOffset, side));
      var carpalMesh = meshInJoint(shoulder, carpal, wingMaterial, 'continuous-carpal-feathers', shoulderOffset, side);
      rig.meshes.push(carpalMesh); rig.bridge = makeCarpalBridge(carpalMesh, wrist);
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
      alula.userData.restPosition = alula.position.clone();
      alula.userData.quillRoot = new THREE.Vector3().fromBufferAttribute(alula.children[0].geometry.attributes.position, 2);
      alula.userData.closedQuillRoot = new THREE.Vector3().fromBufferAttribute(alula.children[0].geometry.morphAttributes.position[0], 2);
      // Eight primaries overlap at their roots and separate toward their tips.
      for (var primary = 0; primary < 8; primary++) {
        var t = primary / 7;
        var start = [side * (0.433 + t * 0.034), 0.052, -0.071 + t * 0.135];
        var end = [side * (0.605 + Math.sin(t * Math.PI) * 0.017 - t * 0.105), 0.064 + Math.sin(t * Math.PI) * 0.008, -0.09 + t * 0.265];
        var pivot = new THREE.Group(); pivot.name = 'primary-quill-' + primary;
        pivot.position.set(start[0] - wristOffset.x, start[1] - wristOffset.y, start[2] - wristOffset.z); wrist.add(pivot);
        // The fingers point in different directions. Retain each actual
        // shaft axis so recovery feathering turns its vane without swinging
        // the quill away from its attachment or borrowing a wing-wide axis.
        pivot.userData.quillAxis = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]).normalize();
        pivot.userData.quillRotation = new THREE.Quaternion();
        var feather = batch(); appendFeather(feather, start, end, 0.022 - t * 0.004, [0x453e33,0x514638,0x4b4235][primary % 3], 0.008, side);
        var mesh = meshInJoint(pivot, feather, primaryMaterial, 'slotted-primary-' + primary, new THREE.Vector3(start[0], start[1], start[2]), side);
        addPrimaryFlex(mesh); pivot.userData.vane = mesh;
        pivot.userData.restPosition = pivot.position.clone();
        pivot.userData.quillRoot = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 2);
        pivot.userData.closedQuillRoot = new THREE.Vector3().fromBufferAttribute(mesh.geometry.morphAttributes.position[0], 2);
        rig.meshes.push(mesh); rig.primaries.push(pivot);
      }
      wings.push(rig);
    });

    function addTailFlex(mesh) {
      var g = mesh.geometry, source = g.attributes.position, curved = source.clone(), uv = g.attributes.uv;
      // Rectrices yield along the shaft, with a stiff, fixed quill and a
      // progressively softer tip. Preserve each shaft segment's length when
      // authoring the loaded curve instead of stretching it like rubber.
      var previousY = 0, previousZ = 0, previousBentY = 0, bentZ = 0;
      for (var row = 0; row < source.count; row += 5) {
        var center = row + 2, along = 1 - uv.getY(center), bend = 0.014 * along * along * along;
        var y = source.getY(center), z = source.getZ(center), bentY = y + bend;
        if (row) {
          var dy = y - previousY, dz = z - previousZ, bentDY = bentY - previousBentY;
          bentZ += Math.sqrt(Math.max(0, dy * dy + dz * dz - bentDY * bentDY));
        }
        for (var col = 0; col < 5; col++) {
          curved.setY(row + col, source.getY(row + col) + bend);
          curved.setZ(row + col, source.getZ(row + col) + bentZ - z);
        }
        previousY = y; previousZ = z; previousBentY = bentY;
      }
      var bent = new THREE.BufferGeometry(); bent.setAttribute('position', curved); bent.setIndex(g.index.clone()); bent.computeVertexNormals();
      g.morphAttributes.position = [curved]; g.morphAttributes.normal = [bent.attributes.normal];
      bent.dispose(); mesh.updateMorphTargets();
    }
    var tail = new THREE.Group(); tail.name = 'twelve-feather-rust-tail'; tail.position.set(0, -0.012, 0.172); upperBody.add(tail);
    for (var tf = 0; tf < 12; tf++) {
      var across = (tf / 11 - 0.5) * 2, tb = batch();
      appendFeather(tb, [0, 0, 0], [0, -0.005, 0.184 - Math.abs(across) * 0.012], 0.0185, 0xffffff, 0.004);
      var tm = addMesh(tail, finishBatch(tb), tailMaterial, 'rectrix-' + (tf + 1));
      addTailFlex(tm);
      tm.position.set(across * 0.019, (1 - Math.abs(across)) * 0.001, -Math.abs(across) * 0.006);
      tailFeathers.push({ mesh: tm, across: across });
    }

    var legMat = material({ color: 0xaa8a4b, roughness: 0.9, morphTargets: true, morphNormals: true }), clawMat = material({ color: 0x37332c, roughness: 0.49 });
    // Scale coordinates follow each curved digit, including the crouched
    // tarsus morph. Broad scutes face forward/up; smaller staggered scales
    // wrap the sides. Fade the fine pattern before it becomes subpixel.
    legMat.extensions = { derivatives: true };
    legMat.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 birdScaleCoord;\nvarying vec3 vHawkScale;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHawkScale=birdScaleCoord;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHawkScale;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + [
          'float scaleRow=vHawkScale.x+0.10*cos(vHawkScale.y*1.04719755);',
          'float scaleAlong=fract(scaleRow),scaleAcross=fract(vHawkScale.y+mod(floor(scaleRow),2.0)*0.5);',
          'float scaleAA=max(fwidth(scaleRow),0.025),scaleCrossAA=max(fwidth(vHawkScale.y),0.025);',
          'float scaleDetail=1.0-smoothstep(0.22,0.65,max(scaleAA,scaleCrossAA));',
          'float scaleRim=1.0-smoothstep(0.035,0.11+scaleAA,min(scaleAlong,1.0-scaleAlong));',
          'float scaleSide=1.0-smoothstep(0.025,0.09+scaleCrossAA,min(scaleAcross,1.0-scaleAcross));',
          'float scaleSeam=max(scaleRim,scaleSide*(1.0-vHawkScale.z*0.92));',
          'float scaleLip=smoothstep(0.48,0.70,scaleAlong)*(1.0-smoothstep(0.75,0.92,scaleAlong));',
          'diffuseColor.rgb*=1.0+scaleDetail*(scaleLip*0.09-scaleSeam*0.30);'
        ].join('\n'));
    };
    legMat.customProgramCacheKey = function () { return 'birdlab-tarsus-digit-scales-v1'; };
    var legPlumeMat = material({ color: 0xd0c2a6, map: contour, bumpMap: contour, bumpScale: 0.0009, roughness: 0.98 });
    // Short thigh feathers follow the existing oval and move with its hock.
    // Author one shared layer in the oval's unit space: the parent's scale
    // keeps the cuff small, including while the feet tuck into the belly.
    var thighFeathers = batch(), thighRows = [0, 0.25, 0.53, 0.80, 1];
    for (var thighRow = 0; thighRow < 8; thighRow++) for (var thighLane = 0; thighLane < 14; thighLane++) {
      var thighStart = 0.19 + thighRow * 0.34, thighAngle = (thighLane + (thighRow % 2) * 0.5) * Math.PI * 2 / 14;
      var thighLength = 0.43 + noise(thighRow + 71, thighLane + 41) * 0.035;
      var thighLay = (noise(thighRow + 51, thighLane + 121) - 0.5) * 0.045;
      var thighBase = thighFeathers.p.length / 3, thighVariant = Math.floor(noise(thighRow + 171, thighLane + 5) * 4);
      var thighTint = new THREE.Color(0xd0c2a6).convertSRGBToLinear().multiplyScalar(0.97 + noise(thighLane + 7, thighRow + 101) * 0.055);
      featherCount += 2;
      for (var thighStation = 0; thighStation < thighRows.length; thighStation++) {
        var thighT = thighRows[thighStation], thighTip = [0.68, 1, 0.96, 0.66, 0.035][thighStation];
        var theta = thighStart + thighLength * thighT;
        for (var thighCross = 0; thighCross < 5; thighCross++) {
          var thighAcross = thighCross / 2 - 1, phi = thighAngle + thighAcross * thighTip * 0.275 + thighLay * thighT * thighT;
          var thighLift = 0.006 + Math.sin(thighT * Math.PI) * 0.006 + thighT * thighT * 0.010;
          var thighRadius = 1 + thighLift;
          thighFeathers.p.push(Math.sin(phi) * Math.sin(theta) * thighRadius, Math.cos(theta) * thighRadius, Math.cos(phi) * Math.sin(theta) * thighRadius);
          thighFeathers.uv.push((thighVariant + 0.008 + thighCross * 0.246) / 4, 1 - thighT);
          var thighEdge = 0.98 + Math.pow(thighT, 4) * 0.035;
          thighFeathers.c.push(thighTint.r * thighEdge, thighTint.g * thighEdge, thighTint.b * thighEdge);
          if (thighStation < thighRows.length - 1 && thighCross < 4) {
            var thighVertex = thighBase + thighStation * 5 + thighCross;
            thighFeathers.i.push(thighVertex, thighVertex + 5, thighVertex + 1, thighVertex + 1, thighVertex + 5, thighVertex + 6);
          }
        }
      }
    }
    var thighGeometry = finishBatch(thighFeathers);
    function tube(parent, points, radius, m, name) {
      var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
      var g = geometry(new THREE.TubeGeometry(curve, 12, radius, 12, false));
      var p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal, scaleCoord = [];
      var isTalon = m === clawMat, isTarsus = name === 'tarsus', scaleRows = curve.getLength() * 270;
      for (var vertex = 0; vertex < p.count; vertex++) {
        var along = uv.getX(vertex);
        if (isTalon) {
          // Preserve the claw's curved centreline and its attachment while
          // narrowing to a fine tip instead of ending in a blunt cylinder.
          var center = curve.getPointAt(along), taper = 0.04 + 0.96 * Math.pow(1 - along, 0.75);
          p.setXYZ(vertex, center.x + (p.getX(vertex) - center.x) * taper,
            center.y + (p.getY(vertex) - center.y) * taper, center.z + (p.getZ(vertex) - center.z) * taper);
        } else {
          var exposed = isTarsus ? -n.getZ(vertex) : n.getY(vertex);
          scaleCoord.push(along * scaleRows, uv.getY(vertex) * 6, smooth(0.15, 0.8, exposed));
        }
      }
      if (isTalon) smoothSphereNormals(g);
      else g.setAttribute('birdScaleCoord', new THREE.Float32BufferAttribute(scaleCoord, 3));
      return addMesh(parent, g, m, name);
    }
    [-1, 1].forEach(function (side) {
      var foot = new THREE.Group(); foot.name = 'anatomical-foot-' + side; foot.position.set(side * 0.044, -0.068, 0.012); root.add(foot);
      foot.userData.side = side; foot.userData.digits = [];
      var legPlume = addMesh(foot, eyeGeo, legPlumeMat, 'feathered-upper-leg-' + side); legPlume.position.set(0, -0.008, 0.004); legPlume.scale.set(0.017, 0.046, 0.022);
      addMesh(legPlume, thighGeometry, contourMaterial, 'layered-thigh-feathers-' + side);
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
    function strokeAngle(phase) {
      var angle = strokeCycle(phase) * Math.PI * 2;
      // A periodic phase warp keeps the loaded stroke at 42% of the cycle,
      // with continuous acceleration at both reversals and the loop seam.
      return angle + 0.08 * Math.PI * 2 / (1 - Math.cos(0.42 * Math.PI * 2)) * (1 - Math.cos(angle));
    }
    function strokeAt(phase) {
      return Math.cos(strokeAngle(phase));
    }
    function featherPressure(phase) {
      var load = Math.sin(strokeAngle(phase));
      // Unload the vane gradually through reversal, retaining only a little
      // reverse flex on recovery. The feather never snaps between two loads.
      return load * (0.58 + 0.42 * Math.tanh(4 * load) / Math.tanh(4));
    }
    function recoveryAt(phase) {
      var cycle = strokeCycle(phase), value = clamp((cycle - 0.42) / 0.58, 0, 1);
      // A rounded recovery arc keeps wrist folding and feather pitch moving
      // throughout the upstroke, with zero speed/acceleration at either end.
      return Math.pow(Math.sin(Math.PI * value), 4);
    }
    var headEuler = new THREE.Euler(), headParentFrame = new THREE.Quaternion(), headNeckFrame = new THREE.Quaternion();
    var headSightline = new THREE.Quaternion(), headRestPose = new THREE.Quaternion();
    var primaryFrame = new THREE.Quaternion(), primaryAnchor = new THREE.Vector3(), primaryOffset = new THREE.Vector3();
    var alulaFrame = new THREE.Quaternion(), alulaAnchor = new THREE.Vector3(), alulaOffset = new THREE.Vector3();
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
      var recovery = recoveryAt(phase);
      // The hand is still rising after the shoulder reverses. Let its fold
      // and feathering follow that recovery instead of straightening early.
      // This modest delay still leads the hand's elevation reversal, ready
      // for the next downstroke; landing retains its authored flare timing.
      var handRecovery = recovery + (recoveryAt(phase - 0.24) - recovery) * (1 - brake);
      // Weak maintenance beats keep the hand broad enough to carry lift.
      // Let recovery folding and vane release settle before stroke depth:
      // the last small beats blend into the supporting glide instead of
      // repeatedly curling the wrist. Full power and landing keep their
      // authored articulation, and this envelope needs no frame history.
      var recoveryArticulation = 1 - (1 - amplitude) * (1 - amplitude) * (1 - brake);
      handRecovery *= recoveryArticulation;
      var glideLoad = (1 - amplitude) * open;
      // Shared airflow comes from the same continuous field that moves the
      // habitat. Positive lift loads both wings; positive roll loads the
      // right wing more. No independent flutter clock or frame history.
      var airLift = clamp(Number(pose.airLift) || 0, -1, 1);
      var airRoll = clamp(Number(pose.airRoll) || 0, -1, 1);
      // Cruise carriage follows speed and turn demand. The signed roll cue
      // relaxes again in a held bank; it is not another continuous flap.
      // Fade these small corrections out before the landing flare.
      var cruiseLoad = glideLoad * (1 - brake);
      var sweep = clamp(Number(pose.wingSweep) || 0, 0, 1) * cruiseLoad;
      var support = clamp(Number(pose.wingSupport) || 0, 0, 1) * cruiseLoad;
      var roll = clamp(Number(pose.rollControl) || 0, -1, 1) * cruiseLoad;
      // Carry the loaded wing slightly forward, then sweep it back through
      // recovery. The hand follows the shoulder's pressure arc a little later,
      // giving powered strokes depth without adding another animation clock.
      // Leave the landing flare and its carefully placed tips undisturbed.
      var poweredSweep = amplitude * open * (1 - brake);
      var shoulderSweep = featherPressure(phase - 0.08) * poweredSweep * 0.040;
      var handSweep = featherPressure(phase - 0.22) * poweredSweep * 0.025;
      var alulaLift = Math.max(clamp(Number(pose.alula) || 0, 0, 1), brake * 0.85);
      // The thumb first lifts clear of the wing, then protracts forward.
      // Its restrained sweep follows the existing low-speed command, so
      // cruise stays flush and the slot closes smoothly before folding.
      var alulaSweep = smooth(0.16, 0.82, alulaLift) * 0.38 * open * open;
      wings.forEach(function (wing) {
        var side = wing.side;
        var airLoad = (airLift * 0.010 + side * airRoll * 0.006) * glideLoad;
        wing.shoulder.rotation.z = side * ((0.075 + stroke * amplitude + brake * 0.16) * open + airLoad + support * 0.020) + roll * 0.012;
        wing.shoulder.rotation.y = -side * (amplitude * recovery * 0.11 * open + sweep * 0.024) + side * shoulderSweep;
        wing.shoulder.rotation.x = (brake * 0.20 + recovery * amplitude * 0.065) * open + side * roll * 0.028;
        wing.wrist.rotation.z = side * (wristStroke * amplitude * open + airLoad * 0.65 + support * 0.045) + roll * 0.020;
        wing.wrist.rotation.y = -side * ((handRecovery * amplitude * 0.34 + brake * 0.08) * open + sweep * 0.16) + side * handSweep;
        wing.wrist.rotation.x = (handRecovery * amplitude * 0.20 - (1 - handRecovery) * amplitude * 0.035 + brake * 0.12) * open +
          (airLift * 0.010 + side * airRoll * 0.004) * glideLoad + support * 0.012 + side * roll * 0.048;
        wing.alula.rotation.y = 0;
        wing.alula.rotation.z = side * alulaLift * 0.42 * open;
        wing.alula.position.copy(wing.alula.userData.restPosition);
        if (alulaSweep) {
          alulaFrame.copy(wing.alula.quaternion);
          wing.alula.rotation.y = side * alulaSweep;
          // The closed morph moves the visible thumb away from its open
          // pivot. Protract around that attachment instead of displacing
          // it during the last partially folded takeoff/landing strokes.
          alulaAnchor.copy(wing.alula.userData.quillRoot).lerp(wing.alula.userData.closedQuillRoot, fold);
          alulaOffset.copy(alulaAnchor).applyQuaternion(alulaFrame);
          wing.alula.position.add(alulaOffset).sub(alulaAnchor.applyQuaternion(wing.alula.quaternion));
        }
        wing.meshes.forEach(function (mesh) { mesh.morphTargetInfluences[0] = fold; });
        updateCarpalBridge(wing, fold);
        wing.primaries.forEach(function (primary, i) {
          var tipLoad = clamp(Number(pose.bank) || 0, -1, 1) * side * (0.016 + i * 0.003);
          var tipResponse = 1 - i * 0.045;
          primary.rotation.z = side * (strokeAt(phase - 0.62 - i * 0.032) * amplitude * 0.09 + tipLoad) * open + side * (airLoad * 0.35 + support * 0.025) * tipResponse;
          // Fan the fingers about their quills without moving their roots.
          // Differential incidence raises the right leading edge for a
          // positive roll, then reverses as the bird levels its wings.
          // Open the slotted tips with the landing flare after cruise trim
          // has faded. Relax a little during recovery, then close the fan
          // before the folded vanes settle against the body.
          var flareFan = brake * open * open * (1 - recovery * amplitude * 0.35);
          primary.rotation.y = side * (3.5 - i) * support * 0.024;
          primary.rotation.x = (Math.sin(phase - 0.52) * amplitude * 0.105 + recoveryAt(phase - 0.12 - i * 0.018) * amplitude * recoveryArticulation * 0.12 + (i - 3.5) * 0.007 + tipLoad * 0.35) * open + side * roll * 0.026 * tipResponse;
          if (flareFan) {
            primaryFrame.copy(primary.quaternion);
            primary.rotation.y += side * (3.5 - i) * flareFan * 0.035;
          }
          // Release the vane through recovery, with a small delay along the
          // fingers, then lie flat for the next loaded stroke. Local quill
          // twist follows the existing carriage and is mirrored by side.
          var quillRelease = recoveryAt(phase - 0.18 - i * 0.026) * amplitude * recoveryArticulation * open * open * (0.13 + i * 0.045 / 7);
          if (quillRelease) {
            primary.userData.quillRotation.setFromAxisAngle(primary.userData.quillAxis, side * quillRelease);
            primary.quaternion.multiply(primary.userData.quillRotation);
            if (flareFan) primaryFrame.multiply(primary.userData.quillRotation);
          }
          var pressure = featherPressure(phase - 0.16 - i * 0.025);
          primary.userData.vane.morphTargetInfluences[1] = (pressure * amplitude * 0.72 +
            (airLift * 0.14 + side * airRoll * 0.06) * glideLoad * tipResponse + tipLoad * 2.0 +
            (support * 0.10 + side * roll * 0.07) * tipResponse) * open;
          // The folding morph carries the visible quill away from its open
          // pivot. Fan around that actual attachment, including while the
          // wing settles, so the new spread cannot pull a root out of place.
          primary.position.copy(primary.userData.restPosition);
          if (flareFan) {
            primaryAnchor.copy(primary.userData.quillRoot).lerp(primary.userData.closedQuillRoot, fold);
            primaryOffset.copy(primaryAnchor).applyQuaternion(primaryFrame);
            primary.position.add(primaryOffset).sub(primaryAnchor.applyQuaternion(primary.quaternion));
          }
        });
      });
      // Let the rectrices share the wing's existing cruise trim: tuck the
      // fan slightly during a swept pass, and broaden it as turn load grows.
      // Multiplying available spread preserves the fan's bounds without a
      // hard clamp. Cruise trim already fades before flaring or folding.
      fan = fan * (1 - sweep * 0.36) + (1 - fan) * support * 0.16;
      var tailTrim = support * 0.045 - sweep * 0.014;
      // Tail extends along +Z: positive X lowers its tip during braking.
      tail.rotation.x = -0.06 - fan * 0.11 + brake * 0.42 + strokeAt(phase - 0.65) * amplitude * 0.025 * open + airLift * 0.021 * glideLoad + tailTrim;
      tail.rotation.z = clamp(Number(pose.bank) || 0, -1, 1) * -0.18 - airRoll * 0.028 * glideLoad;
      tail.rotation.y = clamp(Number(pose.bank) || 0, -1, 1) * 0.065 * open + airRoll * 0.012 * glideLoad + roll * 0.018;
      tailFeathers.forEach(function (feather) {
        feather.mesh.rotation.y = feather.across * (0.045 + fan * 0.40);
        feather.mesh.rotation.x = Math.abs(feather.across) * fan * 0.022 + strokeAt(phase - 0.8 - Math.abs(feather.across) * 0.12) * amplitude * open * 0.012 +
          (airLift * 0.010 * (0.3 + Math.abs(feather.across) * 0.7) + airRoll * feather.across * 0.006) * glideLoad;
        // Pressure lifts the free end while the fan and quill remain attached.
        // Outer feathers respond a little more slowly to the same downstroke;
        // the shared breeze supplies the small left/right difference in glide.
        var tailPressure = featherPressure(phase - 0.65 - Math.abs(feather.across) * 0.10);
        feather.mesh.morphTargetInfluences[0] = (brake * 0.72 + tailPressure * amplitude * 0.18 +
          (airLift * 0.10 + airRoll * feather.across * 0.055) * glideLoad + support * 0.14) * open;
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
      var headBodyPitch = clamp(Number(pose.pitch) || 0, -0.6, 0.6), headBodyBank = clamp(Number(pose.bank) || 0, -1, 1);
      // Aim in the heading frame before removing the body's compound pitch,
      // bank and neck carriage. A sideways glance then keeps its elevation
      // and partial horizon stabilization instead of acquiring a new roll.
      // Retain a little body motion: 32% of pitch and 52% of bank.
      headParentFrame.setFromEuler(headEuler.set(headBodyPitch, 0, headBodyBank, 'YXZ'));
      headNeckFrame.setFromEuler(headEuler.set(upperBody.rotation.x, 0, 0, 'XYZ'));
      headParentFrame.multiply(headNeckFrame).invert();
      headSightline.setFromEuler(headEuler.set(headBodyPitch * 0.32 + upperBody.rotation.x * 0.42 - state.gazePitch,
        state.headYaw, headBodyBank * 0.52, 'YXZ'));
      head.quaternion.copy(headParentFrame).multiply(headSightline);
      // Folding restores the exact authored perch neck and scanning pose.
      // This spatial blend is sampled directly; pausing and seeking do not
      // accumulate a spring, lag or quaternion history.
      headRestPose.setFromEuler(headEuler.set(-headBodyPitch * 0.68 - upperBody.rotation.x * 0.58 - state.gazePitch,
        state.headYaw, -headBodyBank * 0.48 * open, 'XYZ'));
      head.quaternion.slerp(headRestPose, smooth(0, 1, fold));
      head.position.y = 0.068 + compression * 0.006 - recoil * 0.60;
      head.position.z = -0.202 - compression * 0.005;
      var breath = Number.isFinite(pose.breath) ? pose.breath : (Math.sin(elapsed * 2.1) + 1) * 0.5;
      torso.scale.y = 1 + clamp(breath, 0, 1) * 0.006 * fold;
      // Occasional blinks follow the observation clock, including repeated
      // seeks. Closing the lid leaves the globe, iris and orbital rim fixed.
      var blinkPhase = elapsed % 8.4;
      blinkClosure.value = Number.isFinite(pose.blink) ? clamp(pose.blink, 0, 1) :
        smooth(7.92, 7.98, blinkPhase) * (1 - smooth(8.04, 8.11, blinkPhase));
      eyelids.forEach(function (lid) { lid.visible = blinkClosure.value > 0.0001; });
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
