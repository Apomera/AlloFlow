import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const start=source.indexOf('        engine.measureStructure = function('),end=source.indexOf('        // ── 3D Dimension Lines',start);
function fixture(){
 const engine={blocks:{}};
 [[0,1,0],[1,1,0],[2,1,0],[8,1,0]].forEach(([x,y,z])=>{engine.blocks[x+','+y+','+z]={userData:{gridPos:{x,y,z},volume:1,shape:'cube',blockType:'stone',_measurementLayer:'student'}};});
 new Function('engine','MEASUREMENT_BLOCK_LIMIT','belongsToMeasuredComponent','countExposedCubeFaces','enrichMeasurement','formatVolume',source.slice(start,end))(engine,1500,(a,b)=>a._measurementLayer===b._measurementLayer,()=>({surfaceArea:0}),x=>x,String);
 return engine;
}
describe('exact manual selection measurements',()=>{
 it('keeps only the explicit cells while ordinary connected measurements still expand',()=>{const e=fixture(),chosen=[{x:1,y:1,z:0}];expect(e.measureStructure(1,1,0,chosen,true).blocks).toEqual(chosen);expect(e.measureStructure(1,1,0,chosen).count).toBe(3);});
 it('keeps disconnected chosen parts without adopting their neighbors',()=>{const e=fixture(),chosen=[{x:1,y:1,z:0},{x:8,y:1,z:0}],m=e.measureStructure(1,1,0,chosen,true);expect(m.blocks).toEqual(chosen);expect(m.totalVolume).toBe(2);expect(m.isComplete).toBe(true);});
 it('drops removed or protected cells without adding replacement neighbors',()=>{const e=fixture(),chosen=[{x:0,y:1,z:0},{x:1,y:1,z:0},{x:8,y:1,z:0}];delete e.blocks['1,1,0'];e.blocks['8,1,0'].userData._measurementLayer='lesson';expect(e.measureStructure(0,1,0,chosen,true).blocks).toEqual([{x:0,y:1,z:0}]);});
});
