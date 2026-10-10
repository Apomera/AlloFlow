const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const source=fs.readFileSync(repo+'/stem_lab/stem_tool_cephalopodlab.js','utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(source),'78ae23181b99b2b728c62885474db514f6661bf60732390a425a05d50c4e2705');
const changes=[];
function change(before,after){assert.equal(source.split(before).length-1,1);changes.push({before,after});}
const helper=`        function shadeCLHuntWaterSurface(shader,flow,derivatives){
          shader.uniforms.clSurfaceFlow=flow;
          shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\\nvarying vec3 clSurfaceWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\\nclSurfaceWorld=(modelMatrix*vec4(position,1.0)).xyz;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\\nvarying vec3 clSurfaceWorld; uniform float clSurfaceFlow;\\nfloat clSurfaceFilter(float footprint){return 1.0-smoothstep(0.55,1.75,footprint);}');
          var waves=[
            'vec2 clSea=clSurfaceWorld.xz;',
            'float clSeaA=dot(clSea,vec2(0.51,0.19))+sin(dot(clSea,vec2(0.11,-0.14)))*0.70-clSurfaceFlow*0.23;',
            'float clSeaB=dot(clSea,vec2(-0.23,0.67))+sin(dot(clSea,vec2(0.15,0.08)))*0.55+clSurfaceFlow*0.17;',
            derivatives?'float clSeaAA=clSurfaceFilter(fwidth(clSeaA)); float clSeaBA=clSurfaceFilter(fwidth(clSeaB));':'float clSeaAA=0.0; float clSeaBA=0.0;',
            'float clSeaSwell=sin(clSeaA)*clSeaAA*0.5+sin(clSeaB)*clSeaBA*0.5;',
            'float clSeaCrest=smoothstep(0.35,0.94,sin(clSeaA))*clSeaAA*0.55+smoothstep(0.45,0.97,sin(clSeaB))*clSeaBA*0.45;',
            'vec3 clSeaView=cameraPosition-clSurfaceWorld;',
            'float clSeaUp=abs(clSeaView.y)/max(length(clSeaView),0.001); float clSeaAngle=smoothstep(0.035,0.18,clSeaUp);',
            'diffuseColor.rgb*=1.0+clSeaAngle*(clSeaSwell*0.12+clSeaCrest*0.20);',
            'diffuseColor.a*=1.0+clSeaAngle*(clSeaSwell*0.28+clSeaCrest*0.42-(clSeaAA*0.55+clSeaBA*0.45)*0.28);'
          ].join('\\n');
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\\n'+waves);
        }
`;
change('        var surfaceSheet = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), surfaceMat);',helper+`        var surfaceFlow={value:0},surfaceDerivatives=renderer.capabilities.isWebGL2||renderer.extensions.has('OES_standard_derivatives');
        surfaceMat.name='cl-water-surface-material';surfaceMat.extensions={derivatives:surfaceDerivatives};surfaceMat.userData.clSurfaceFlow=surfaceFlow;
        surfaceMat.onBeforeCompile=function(shader){shadeCLHuntWaterSurface(shader,surfaceFlow,surfaceDerivatives);};
        surfaceMat.customProgramCacheKey=function(){return 'cl-water-surface-v55-'+(surfaceDerivatives?'filtered':'plain');};
        var surfaceSheet = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), surfaceMat);surfaceSheet.name='cl-water-surface';`);
change('            surfaceMat.opacity = (0.035 + 0.13 * dayMix)*depthLight;','            surfaceMat.opacity = (0.035 + 0.13 * dayMix)*depthLight;\n            surfaceFlow.value=causticPhase;');
let candidate=source;for(const c of changes)candidate=candidate.replace(c.before,c.after);
new Function(candidate);
const dir=path.join(__dirname,'pass55-work');fs.mkdirSync(dir,{recursive:true});
const label=process.argv[2]||'candidate';
fs.writeFileSync(dir+'/baseline-source.js',source);fs.writeFileSync(dir+'/'+label+'-source.js',candidate);fs.writeFileSync(dir+'/'+(label==='candidate'?'change-guards':label+'-change-guards')+'.json',JSON.stringify({baselineSHA:sha(source),candidateSHA:sha(candidate),changes},null,2)+'\n');
fs.writeFileSync(dir+'/'+(label==='candidate'?'shade-water-surface':label+'-shade-water-surface')+'.js',helper);
console.log(JSON.stringify({dir,baselineSHA:sha(source),candidateSHA:sha(candidate),changes:changes.length}));
