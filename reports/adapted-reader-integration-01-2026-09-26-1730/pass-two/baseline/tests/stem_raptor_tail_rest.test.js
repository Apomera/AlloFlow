import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('function createTailFeatherGeometry('),end=source.indexOf('        var tailGeometry =',start);
const make=Function('THREE','return ('+source.slice(start,end).trim()+')')(THREE);
describe('Resting tail fan geometry',()=>{
  for(const [width,length,fan] of [[0.35,0.4,1],[0.5,0.9,1.3],[0.28,1.2,0.8],[0.82,0.66,0.82],[0.78,0.54,0.76]])it('closes without squeezing feathers for '+[width,length,fan].join('/'),()=>{
    const g=make(width,length,fan),open=g.attributes.position,closed=g.morphAttributes.position[0],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    expect(open.count).toBe(96);expect(closed.count).toBe(open.count);expect(g.morphAttributes.normal[0].count).toBe(open.count);
    for(const attr of [open,closed,g.attributes.normal,g.morphAttributes.normal[0]])expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
    let openWidth=0,closedWidth=0;
    for(let i=0;i<open.count;i++){openWidth=Math.max(openWidth,Math.abs(open.getX(i)));closedWidth=Math.max(closedWidth,Math.abs(closed.getX(i)));}
    expect(closedWidth).toBeLessThan(openWidth*0.68);
    for(let f=0;f<12;f++)for(let v=1;v<8;v++){
      const i=f*8,j=i+v;
      const before=a.fromBufferAttribute(open,i).distanceTo(b.fromBufferAttribute(open,j));
      const after=a.fromBufferAttribute(closed,i).distanceTo(b.fromBufferAttribute(closed,j));
      expect(after).toBeCloseTo(before,6);
    }
    // The center pair must reach at least as far back as the outer tips after closing.
    expect(closed.getZ(5*8+4)).toBeLessThan(closed.getZ(4));
    expect(g.attributes.rhTailAlong.count).toBe(open.count);
    const ids=g.index.array;
    for(const blend of [0,0.25,0.5,0.75,1])for(let i=0;i<ids.length;i+=3){
      const points=[a,b,c];for(let j=0;j<3;j++){const k=ids[i+j];points[j].set(open.getX(k)*(1-blend)+closed.getX(k)*blend,open.getY(k)*(1-blend)+closed.getY(k)*blend,open.getZ(k)*(1-blend)+closed.getZ(k)*blend);}
      expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-7);
    }
    g.dispose();
  });
});
