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
  it('holds one placement while the prey jitters across the lower boundary',()=>{
    let placement='',previousTop=null,flips=0;
    const samples=[335.5,336.5,335.5,336.5,335.2,336.2,335.8,336.8];
    for(const y of samples){
      const result=layout(200,y,400,420,placement);
      if(placement&&result.placement!==placement)flips++;
      if(previousTop!==null&&placement===result.placement)expect(Math.abs(result.top-previousTop)).toBeLessThan(2);
      placement=result.placement;previousTop=result.top;
    }
    expect(flips).toBe(1);expect(placement).toBe('above');
    expect(layout(200,320,400,420,placement).placement).toBe('above');
    expect(layout(200,310,400,420,placement).placement).toBe('below');
  });
  it('immediately moves a clipping caption above even when it was below',()=>{
    for(const [width,height] of [[240,240],[320,420],[1100,760]]){
      const y=height-34,result=layout(width/2,y,width,height,'below');
      expect(result.placement).toBe('above');
      expect(y-24+result.top+44).toBeLessThanOrEqual(height-8);
    }
  });
  it('releases prior placement for a newly acquired target and adapts to a resize',()=>{
    expect(layout(200,330,400,420,'above').placement).toBe('above');
    expect(layout(200,330,400,420,'').placement).toBe('below');
    const resized=layout(160,360,320,380,'below');
    expect(resized.placement).toBe('above');
    expect(360-24+resized.top+44).toBeLessThanOrEqual(372);
    expect(layout(160,360,320,680,resized.placement).placement).toBe('below');
  });
});
