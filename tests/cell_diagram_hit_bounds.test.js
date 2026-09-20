import {beforeAll,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
let C;
beforeAll(()=>{window.StemLab={registerTool(){}};new Function(readFileSync('stem_lab/stem_tool_cell.js','utf8'))();C=window.__alloCellPure;});
it('rejects points beyond the cell envelope at every supported zoom and cell type',()=>{
 for(const type of ['animal','plant','bacterium']) for(const zoom of [.85,1,1.25]) {
  const g=C.interiorGeometry(760,440,type,zoom);
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) expect(C.interiorHitTest(type,(g.cx+sx*(g.RX+20))/760,(g.cy+sy*(g.RY+20))/440,760,440,zoom)).toBeNull();
  if(zoom<=1) expect(C.interiorHitTest(type,0,0,760,440,zoom)).toBeNull();
 }
});
it('keeps membrane and wall edges selectable',()=>{
 for(const type of ['animal','plant','bacterium']) for(const zoom of [.85,1,1.25]) {
  const g=C.interiorGeometry(760,440,type,zoom);
  expect(C.interiorHitTest(type,(g.cx+g.RX)/760,g.cy/440,760,440,zoom)).toBe(type==='animal'?'cellMembrane':'cellWall');
 }
});
it('retains explicit surface-structure targets before checking the cell envelope',()=>{
 for(const key of ['pili','flagellum','capsule']) {
  const item=C.interiorLayout('bacterium').find(item=>item.key===key);
  expect(C.interiorHitTest('bacterium',item.x,item.y)).toBe(key);
 }
});
