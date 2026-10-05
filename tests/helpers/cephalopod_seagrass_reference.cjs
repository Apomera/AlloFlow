'use strict';
// Paired current-source reference: exclude only the approved static grass insertion.
// No report, task file or frozen replacement factory participates in normal test runs.
const approvedGrassFinish="        // Fuller seagrass straps use the existing edge vertices and folded center vein.\n        // Preserve actual Float32 extrema: habitat placement uses this geometry's real footprint.\n        if(!kelp){\n          var grassMinX=Infinity,grassMaxX=-Infinity,grassMinZ=Infinity,grassMaxZ=-Infinity;\n          for(var grassBound=0;grassBound<positions.length;grassBound+=3){var grassBX=Math.fround(positions[grassBound]),grassBZ=Math.fround(positions[grassBound+2]);grassMinX=Math.min(grassMinX,grassBX);grassMaxX=Math.max(grassMaxX,grassBX);grassMinZ=Math.min(grassMinZ,grassBZ);grassMaxZ=Math.max(grassMaxZ,grassBZ);}\n          for(var grassRow=1;grassRow<sections;grassRow++){\n            var grassT=grassRow/sections,grassEnvelope=Math.pow(1-grassT,0.65)*(0.68+0.32*Math.sin(grassT*Math.PI));\n            var grassStrap=0.68*(1+0.12*Math.sin(grassT*Math.PI))*Math.sqrt(Math.min(1,(1-grassT)/0.28)),grassGrowth=1+0.70*Math.max(0,grassStrap/grassEnvelope-1);\n            var grassAt=grassRow*columns*3,grassCenterX=(positions[grassAt]+positions[grassAt+6])*0.5,grassCenterZ=(positions[grassAt+2]+positions[grassAt+8])*0.5;\n            for(var grassSide=0;grassSide<columns;grassSide+=2){\n              var grassEdge=grassAt+grassSide*3,grassX=positions[grassEdge],grassZ=positions[grassEdge+2],grassFX=Math.fround(grassX),grassFZ=Math.fround(grassZ);\n              if(grassFX===grassMinX||grassFX===grassMaxX||grassFZ===grassMinZ||grassFZ===grassMaxZ)continue;\n              positions[grassEdge]=Math.max(grassMinX,Math.min(grassMaxX,grassCenterX+(grassX-grassCenterX)*grassGrowth));\n              positions[grassEdge+2]=Math.max(grassMinZ,Math.min(grassMaxZ,grassCenterZ+(grassZ-grassCenterZ)*grassGrowth));\n            }\n          }\n        }\n";
const anchor='        // Four attached folded ribbons broaden each kelp silhouette without new scene objects.';
function restoreOriginalSeagrassSource(source){
  if(typeof source!=='string')throw new TypeError('Expected simulator source text');
  const lineEnding=source.includes('\r\n')?'\r\n':'\n',block=approvedGrassFinish.replace(/\n/g,lineEnding);
  if(source.split(block).length!==2)throw new Error('Expected one exact approved seagrass insertion; missing, changed or duplicated block');
  if(source.split(anchor).length!==2)throw new Error('Expected one original kelp boundary anchor');
  const reference=source.replace(block,'');
  if(reference.includes(approvedGrassFinish.split('\n')[0])||reference.replace(anchor,block+anchor)!==source)throw new Error('Seagrass reference failed exact byte round trip');
  return reference;
}
module.exports={restoreOriginalSeagrassSource};
