import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
// 66296cfd0 rebuilt the fan: curved, rounded vanes whose row count follows graphicsQuality
// (an initHuntSim closure variable), and three whole-vane poses (rest, wide, narrow).
const start=source.indexOf('function createTailFeatherGeometry('),end=source.indexOf('        var tailFanSpread=1;',start);
const build=quality=>Function('THREE','graphicsQuality','return ('+source.slice(start,end).trim()+')')(THREE,quality);
// Per vane: (core + cap stations) rows x 3 columns, plus one tip vertex.
const qualities=[['low',(4+3)*3+1],['balanced',(6+5)*3+1]];
describe('Resting tail fan geometry',()=>{
  for(const [quality,per] of qualities)for(const [width,length,fan] of [[0.35,0.4,1],[0.5,0.9,1.3],[0.28,1.2,0.8],[0.82,0.66,0.82],[0.78,0.54,0.76]])it('closes without squeezing feathers for '+[width,length,fan].join('/')+' ('+quality+')',()=>{
    const g=build(quality)(width,length,fan),open=g.attributes.position,closed=g.morphAttributes.position[0],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    expect(g.morphAttributes.position.map(p=>p.name)).toEqual(['resting-fan','wide-fan','narrow-fan']);
    expect(open.count).toBe(12*per);for(const i of [0,1,2]){expect(g.morphAttributes.position[i].count).toBe(open.count);expect(g.morphAttributes.normal[i].count).toBe(open.count);}
    for(const attr of [open,...g.morphAttributes.position,g.attributes.normal,...g.morphAttributes.normal])expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
    let openWidth=0,closedWidth=0;
    for(let i=0;i<open.count;i++){openWidth=Math.max(openWidth,Math.abs(open.getX(i)));closedWidth=Math.max(closedWidth,Math.abs(closed.getX(i)));}
    expect(closedWidth).toBeLessThan(openWidth*0.68);
    // Every pose turns whole vanes about their roots: no vertex moves relative to its vane.
    for(const pose of g.morphAttributes.position)for(let f=0;f<12;f++)for(let v=1;v<per;v++){
      const i=f*per,j=i+v;
      const before=a.fromBufferAttribute(open,i).distanceTo(b.fromBufferAttribute(open,j));
      const after=a.fromBufferAttribute(pose,i).distanceTo(b.fromBufferAttribute(pose,j));
      expect(after).toBeCloseTo(before,6);
    }
    // The center pair must reach at least as far back as the outer tips after closing.
    const tip=f=>f*per+per-1;
    expect(closed.getZ(tip(5))).toBeLessThan(closed.getZ(tip(0)));
    expect(g.attributes.rhTailAlong.count).toBe(open.count);
    const ids=g.index.array;
    for(const blend of [0,0.25,0.5,0.75,1])for(let i=0;i<ids.length;i+=3){
      const points=[a,b,c];for(let j=0;j<3;j++){const k=ids[i+j];points[j].set(open.getX(k)*(1-blend)+closed.getX(k)*blend,open.getY(k)*(1-blend)+closed.getY(k)*blend,open.getZ(k)*(1-blend)+closed.getZ(k)*blend);}
      expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-7);
    }
    g.dispose();
  });
});
