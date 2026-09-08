import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {rect,mapTarget,compose}=require('../it_coach/image_review.js');
describe('screenshot editing geometry',()=>{
  it.each([null,{}, {x:0,y:0,w:0,h:1},{x:2,y:0,w:1,h:1},{x:NaN,y:0,w:1,h:1}])('rejects invalid or empty area %j',r=>expect(rect(r)).toBeNull());
  it('clips areas to the screenshot',()=>expect(rect({x:-.2,y:.9,w:.5,h:.5})).toEqual({x:0,y:.9,w:.3,h:expect.closeTo(.1)}));
  it('maps crop-relative targets to full screen coordinates',()=>expect(mapTarget({x:.2,y:.4,w:.1,h:.2},{x:.25,y:.1,w:.5,h:.5},[])).toEqual({x:.35,y:expect.closeTo(.3),w:expect.closeTo(.05),h:expect.closeTo(.1)}));
  it('drops targets intersecting hidden areas',()=>expect(mapTarget({x:.2,y:.4,w:.1,h:.2},{x:.25,y:.1,w:.5,h:.5},[{x:.36,y:.31,w:.01,h:.01}])).toBeNull());
  it('keeps targets outside hidden areas',()=>expect(mapTarget({x:.1,y:.1,w:.1,h:.1},null,[{x:.6,y:.6,w:.1,h:.1}])).not.toBeNull());
  it('rounds crop and opaque mask edges outward to full pixels',()=>{
    const g={drawImage:vi.fn(),fillRect:vi.fn()},c={getContext:()=>g};
    const source={width:100,height:100,ownerDocument:{createElement:()=>c}};
    const out=compose(source,{x:.105,y:.205,w:.201,h:.301},[{x:.151,y:.251,w:.101,h:.101}]);
    expect(c.width).toBe(21);expect(c.height).toBe(31);expect(g.drawImage).toHaveBeenCalledWith(source,10,20,21,31,0,0,21,31);
    expect(g.fillStyle).toBe('#000');expect(g.fillRect).toHaveBeenCalledWith(5,5,11,11);
    expect(out.crop).toEqual({x:.1,y:.2,w:.21,h:.31});
  });
});
