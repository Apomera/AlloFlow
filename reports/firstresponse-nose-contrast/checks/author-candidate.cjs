const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),before=fs.readFileSync(path.join(__dirname,'before.js'),'utf8');
const baseline='9de34818d5428c3b453f8617c4bd5622c711fbe79acd77fd2ef4fd35119f3f76';assert.equal(sha(before),baseline);
const old='    var nose = new THREE.Mesh(noseGeometry,skin);';
const replacement=String.raw`    var noseSkin = skin;
    if (api.contrast) {
      // A curved edge keeps the white nose visible against the white cheek.
      noseSkin = skin.clone(); noseSkin.name = 'fr-patient-nose-skin';
      var noseContourStrength = { value: 1 };
      noseSkin.userData.frNoseContourStrength = noseContourStrength;
      noseSkin.onBeforeCompile = function (shader) {
        shader.uniforms.frNoseContourStrength = noseContourStrength;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 frNoseSurfaceNormal;\nvarying vec3 frNoseViewPosition;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nfrNoseSurfaceNormal = normalize(normalMatrix * normal);\nfrNoseViewPosition = -mvPosition.xyz;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 frNoseSurfaceNormal;\nvarying vec3 frNoseViewPosition;\nuniform float frNoseContourStrength;')
          .replace('#include <color_fragment>', '#include <color_fragment>\nfloat frNoseFacing = abs(dot(normalize(frNoseSurfaceNormal), normalize(frNoseViewPosition)));\nfloat frNoseContour = mix(0.08, 1.0, smoothstep(0.20, 0.45, frNoseFacing));\ndiffuseColor.rgb *= mix(1.0, frNoseContour, frNoseContourStrength);');
      };
      noseSkin.customProgramCacheKey = function () { return 'fr-patient-nose-contrast-contours-v1'; };
    }
    var nose = new THREE.Mesh(noseGeometry,noseSkin);`;
assert.equal(before.split(old).length,2);const candidate=before.replace(old,replacement);new Function(candidate);
assert.equal(candidate.replace(replacement,old),before);
fs.writeFileSync(path.join(__dirname,'candidate.js'),candidate);
fs.writeFileSync(path.join(__dirname,'delta.json'),JSON.stringify({beforeSHA256:baseline,afterSHA256:sha(candidate),edits:[{old,new:replacement}]},null,2)+'\n');
console.log(JSON.stringify({beforeSHA256:baseline,afterSHA256:sha(candidate),bytes:Buffer.byteLength(candidate),sourceEdits:1,sharedWrites:0}));
