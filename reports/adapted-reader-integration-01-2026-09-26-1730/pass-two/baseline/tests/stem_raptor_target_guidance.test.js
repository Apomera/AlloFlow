import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('function layoutTargetLabel('),end=source.indexOf('        canvasEl._rhCommand',start);
const layout=Function('return ('+source.slice(start,end).trim()+')')();
describe('Raptor target caption placement',()=>{
  it('keeps the complete caption inside narrow and wide viewports at every edge',()=>{
    for(const [width,height] of [[240,240],[320,420],[420,620],[1100,760]]){
      for(const x of [34,width/2,width-34])for(const y of [34,height/2,height-34]){
        const result=layout(x,y,width,height),left=x-24+result.left,top=y-24+result.top;
        expect(left).toBeGreaterThanOrEqual(8);expect(left+result.width).toBeLessThanOrEqual(width-8);
        expect(top).toBeGreaterThanOrEqual(8);expect(top+44).toBeLessThanOrEqual(height-8);
      }
    }
  });
  it('flips the caption above low targets without shifting the target itself',()=>{
    const low=layout(200,386,400,420),high=layout(200,80,400,420);
    expect(low.top+44).toBeLessThan(0);expect(high.top).toBeGreaterThan(48);
    expect(low.left).toBe(high.left);
  });
});
