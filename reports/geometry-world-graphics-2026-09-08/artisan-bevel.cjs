const fs=require('node:fs'),p='stem_lab/stem_tool_geometryworld.js';let s=fs.readFileSync(p,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b);}
const helper=String.raw`
        // A narrow highlight rounds the lighting at box edges, not their geometry.
        // Measurements, silhouettes and exported triangles remain exact unit cells.
        // Attach after Material.clone(): three r128 does not clone shader hooks.
        engine.configureBlockFinish = function(material, type, shape, isGround) {
          if (isGround || (shape !== 'cube' && shape !== 'halfB') || !/^(stone|wood|brick|sand|gold|diamond)$/.test(type)) return;
          var finish = {
            gwBlockHalfSize: {value:new THREE.Vector3(0.5, shape === 'halfB' ? 0.25:0.5, 0.5)},
            gwBlockBevelWidth: {value:0.018},
            gwBlockBevelStrength: {value:engine._renderProfile && engine._renderProfile.tier === 'saver' ? 0:0.45}
          };
          material._gwBlockFinish = finish;
          material.userData.gwBlockFinish = true;
          material.extensions.derivatives = true;
          material.onBeforeCompile = function(shader) {
            Object.keys(finish).forEach(function(key){shader.uniforms[key]=finish[key];});
            shader.vertexShader = 'varying vec3 vGwBlockPosition;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGwBlockPosition=position;');
            shader.fragmentShader = [
              'varying vec3 vGwBlockPosition;',
              'uniform vec3 gwBlockHalfSize;',
              'uniform float gwBlockBevelWidth;',
              'uniform float gwBlockBevelStrength;',
              '#ifndef OBJECTSPACE_NORMALMAP',
              'uniform mat3 normalMatrix;',
              '#endif',
              shader.fragmentShader
            ].join('\n');
            shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', [
              '#include <normal_fragment_begin>',
              'if(gwBlockBevelStrength > 0.0){',
              '  float gwPixelSpan=max(length(dFdx(vGwBlockPosition)),length(dFdy(vGwBlockPosition)));',
              '  float gwFade=1.0-smoothstep(gwBlockBevelWidth*1.2,gwBlockBevelWidth*4.0,gwPixelSpan);',
              '  vec3 gwInset=gwBlockHalfSize-vec3(gwBlockBevelWidth);',
              '  vec3 gwOffset=vGwBlockPosition-clamp(vGwBlockPosition,-gwInset,gwInset);',
              '  vec3 gwRoundedNormal=normalize(normalMatrix*normalize(gwOffset));',
              '  normal=normalize(mix(normal,gwRoundedNormal,gwBlockBevelStrength*gwFade));',
              '}'
            ].join('\n'));
          };
          material.customProgramCacheKey = function(){return 'gw-block-finish-v1';};
        };

`;
replace('        // Block edge wireframe overlay for visual crispness',helper+'        // Block edge wireframe overlay for visual crispness');
replace('          var mat = getBlockMaterial(grassCube ? \'grass_cube\' : type);', '          var mat = getBlockMaterial(grassCube ? \'grass_cube\' : type);\n          engine.configureBlockFinish(mat,type,shapeId,engine._measurementLayer === \'ground\');');
replace('          function updateSurfaceDetail(material) {', '          function updateSurfaceDetail(material) {\n            if(material && material._gwBlockFinish)material._gwBlockFinish.gwBlockBevelStrength.value=profile.tier === \'saver\' ? 0:0.45;');
// Shader strings must contain escaped newlines in JavaScript, not literal \\n.
s=s.replaceAll("vGwBlockPosition;\\\\n", "vGwBlockPosition;\\n").replaceAll("<begin_vertex>\\\\n", "<begin_vertex>\\n");
// The helper was built with String.raw: .join needs one escaped newline.
const begin=s.indexOf('        engine.configureBlockFinish ='),end=s.indexOf('        // Block edge wireframe',begin);
s=s.slice(0,begin)+s.slice(begin,end).replaceAll(".join('\\\\n')", ".join('\\n')")+s.slice(end);
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}console.log('Subtle box-edge lighting installed without changing geometry.');
