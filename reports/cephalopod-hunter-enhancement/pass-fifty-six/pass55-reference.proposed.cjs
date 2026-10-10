const assert=require('node:assert/strict');
const changes=[
  {
    "before": "        var surfaceSheet = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), surfaceMat);",
    "after": "        function shadeCLHuntWaterSurface(shader,flow,derivatives){\n          shader.uniforms.clSurfaceFlow=flow;\n          shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\\nvarying vec3 clSurfaceWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\\nclSurfaceWorld=(modelMatrix*vec4(position,1.0)).xyz;');\n          shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\\nvarying vec3 clSurfaceWorld; uniform float clSurfaceFlow;\\nfloat clSurfaceFilter(float footprint){return 1.0-smoothstep(0.55,1.75,footprint);}');\n          var waves=[\n            'vec2 clSea=clSurfaceWorld.xz;',\n            'float clSeaA=dot(clSea,vec2(0.51,0.19))+sin(dot(clSea,vec2(0.11,-0.14)))*0.70-clSurfaceFlow*0.23;',\n            'float clSeaB=dot(clSea,vec2(-0.23,0.67))+sin(dot(clSea,vec2(0.15,0.08)))*0.55+clSurfaceFlow*0.17;',\n            derivatives?'float clSeaAA=clSurfaceFilter(fwidth(clSeaA)); float clSeaBA=clSurfaceFilter(fwidth(clSeaB));':'float clSeaAA=0.0; float clSeaBA=0.0;',\n            'float clSeaSwell=sin(clSeaA)*clSeaAA*0.5+sin(clSeaB)*clSeaBA*0.5;',\n            'float clSeaCrest=smoothstep(0.35,0.94,sin(clSeaA))*clSeaAA*0.55+smoothstep(0.45,0.97,sin(clSeaB))*clSeaBA*0.45;',\n            'vec3 clSeaView=cameraPosition-clSurfaceWorld;',\n            'float clSeaUp=abs(clSeaView.y)/max(length(clSeaView),0.001); float clSeaAngle=smoothstep(0.035,0.18,clSeaUp);',\n            'diffuseColor.rgb*=1.0+clSeaAngle*(clSeaSwell*0.12+clSeaCrest*0.20);',\n            'diffuseColor.a*=1.0+clSeaAngle*(clSeaSwell*0.28+clSeaCrest*0.42-(clSeaAA*0.55+clSeaBA*0.45)*0.28);'\n          ].join('\\n');\n          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\\n'+waves);\n        }\n        var surfaceFlow={value:0},surfaceDerivatives=renderer.capabilities.isWebGL2||renderer.extensions.has('OES_standard_derivatives');\n        surfaceMat.name='cl-water-surface-material';surfaceMat.extensions={derivatives:surfaceDerivatives};surfaceMat.userData.clSurfaceFlow=surfaceFlow;\n        surfaceMat.onBeforeCompile=function(shader){shadeCLHuntWaterSurface(shader,surfaceFlow,surfaceDerivatives);};\n        surfaceMat.customProgramCacheKey=function(){return 'cl-water-surface-v55-'+(surfaceDerivatives?'filtered':'plain');};\n        var surfaceSheet = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), surfaceMat);surfaceSheet.name='cl-water-surface';"
  },
  {
    "before": "            surfaceMat.opacity = (0.035 + 0.13 * dayMix)*depthLight;",
    "after": "            surfaceMat.opacity = (0.035 + 0.13 * dayMix)*depthLight;\n            surfaceFlow.value=causticPhase;"
  }
];
// Pass55 changes only existing surface presentation; preserve earlier exact source baselines.
function restorePass55Source(source){
  if(source.includes('function createCLHuntDenWeatheredGeometry('))source=require('./cephalopod_pass56_reference.cjs').restorePass56Source(source);
  const animalOnly=source.trimStart().startsWith('function createCLHuntAnimal(');
  assert.ok(animalOnly||source.includes('function initHuntSim3D('),'Pass55 requires the full tool or animal factory');
  if(animalOnly)return source;
  for(const c of [...changes].reverse()){assert.equal(source.split(c.after).length-1,1,'Pass55 exact inverse guard');source=source.replace(c.after,c.before);}
  return source;
}
module.exports={restorePass55Source};
