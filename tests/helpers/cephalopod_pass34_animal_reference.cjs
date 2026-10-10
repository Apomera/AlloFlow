const assert=require('node:assert/strict');
// Only the seven approved Pass34 squid pigment changes; no gameplay preparation.
const guards=[
  {
    "name": "medium-helpers",
    "before": "\\nfloat clSqRoughness(float base,float fine,float fineAA)",
    "after": "\\nfloat clSqMediumTone(float medium,float dorsal,float ventral,float mediumAA){float pigment=smoothstep(0.32,0.75,medium);float strength=(0.15+0.15*dorsal)*(1.0-ventral);return 1.0-pigment*strength*mediumAA;}\\nfloat clSqMediumRoughness(float base,float macro,float medium,float mediumAA,float ventral){float response=(macro-0.5)*0.06+(medium-0.5)*0.14*mediumAA;return clamp(base+response*(1.0-ventral),0.38,0.64);}\\nfloat clSqRoughness(float base,float fine,float fineAA)"
  },
  {
    "name": "medium-domain",
    "before": "vec3 clSqFinePos=clSkinPos*vec3(112.0,128.0,104.0);",
    "after": "vec3 clSqMediumPos=clSkinPos*vec3(20.0,28.0,18.0)+vec3(0.0,clMacro*0.60,0.0); float clMedium=clNoise(clSqMediumPos); vec3 clSqFinePos=clSkinPos*vec3(112.0,128.0,104.0);"
  },
  {
    "name": "medium-filter",
    "before": "float clSqFineAA=clSqDetailFilter(length(fwidth(clSqFinePos)));",
    "after": "float clSqMediumAA=clSqDetailFilter(length(fwidth(clSqMediumPos))); float clSqFineAA=clSqDetailFilter(length(fwidth(clSqFinePos)));"
  },
  {
    "name": "medium-fallback",
    "before": "float clSqFineAA=0.0; float clSqGrainAA=0.0;",
    "after": "float clSqMediumAA=0.35; float clSqFineAA=0.0; float clSqGrainAA=0.0;"
  },
  {
    "name": "medium-pigment",
    "before": "diffuseColor.rgb*=clSqMottleTone(clPatch,clDorsal,clVentral);",
    "after": "diffuseColor.rgb*=clSqMottleTone(clPatch,clDorsal,clVentral); diffuseColor.rgb*=clSqMediumTone(clMedium,clDorsal,clVentral,clSqMediumAA);"
  },
  {
    "name": "medium-response",
    "before": "roughnessFactor=clSqRoughness(roughnessFactor,clFine,clSqFineAA);",
    "after": "roughnessFactor=clSqMediumRoughness(clSqRoughness(roughnessFactor,clFine,clSqFineAA),clMacro,clMedium,clSqMediumAA,clVentral);"
  },
  {
    "name": "skin-key",
    "before": "cl-squid-surface-v27-mottled",
    "after": "cl-squid-surface-v34-layered"
  }
];
function restorePass34AnimalSource(source){for(const g of [...guards].reverse()){assert.equal(source.split(g.after).length-1,1,g.id||g.name);source=source.replace(g.after,g.before);}return source;}
module.exports={restorePass34AnimalSource};
