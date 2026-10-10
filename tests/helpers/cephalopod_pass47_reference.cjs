const assert=require('node:assert/strict');
const changes=[
  {
    "label": "gel shading helper",
    "before": "        function createCLHuntMoonJellyVisual(THREE,index){",
    "after": "        // Clearer face-on gel and a soft rim reflection use the existing PBR light and normals.\n        function shadeCLHuntJellyGel(shader) {\n          shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',[\n            'vec3 clJellyView=isOrthographic?vec3(0.0,0.0,1.0):normalize(vViewPosition);',\n            'vec3 clJellyNormal=normalize(normal);',\n            'float clJellyFacing=clamp(abs(dot(clJellyNormal,clJellyView)),0.0,1.0);',\n            'float clJellyEdge=pow(1.0-clJellyFacing,2.5);',\n            'vec3 clJellyReflection=inverseTransformDirection(reflect(-clJellyView,clJellyNormal),viewMatrix);',\n            'float clJellySky=smoothstep(-0.08,0.78,clJellyReflection.y);',\n            'diffuseColor.a*=0.32+0.68*clJellyEdge;',\n            'outgoingLight+=reflectedLight.indirectDiffuse*vec3(0.14,0.24,0.28)*clJellyEdge*(0.35+0.65*clJellySky);',\n            'gl_FragColor = vec4( outgoingLight, diffuseColor.a );'\n          ].join('\\n'));\n        }\n        function clHuntJellyGelProgramKey(){return 'cl-jelly-gel-v1';}\n        function finishCLHuntJellyGel(material){\n          material.onBeforeCompile=shadeCLHuntJellyGel;\n          material.customProgramCacheKey=clHuntJellyGelProgramKey;\n          return material;\n        }\n\n        function createCLHuntMoonJellyVisual(THREE,index){"
  },
  {
    "label": "both shell sides use the gel shader",
    "before": "          var bellFrontMaterial=bellBackMaterial.clone();bellFrontMaterial.side=THREE.FrontSide;",
    "after": "          var bellFrontMaterial=bellBackMaterial.clone();bellFrontMaterial.side=THREE.FrontSide;\n          finishCLHuntJellyGel(bellBackMaterial);finishCLHuntJellyGel(bellFrontMaterial);"
  }
];
function restorePass47Source(source){for(const change of [...changes].reverse()){assert.equal(source.split(change.after).length-1,1,'Pass47 inverse guard: '+change.label);source=source.replace(change.after,change.before);}return source;}
module.exports={restorePass47Source};
