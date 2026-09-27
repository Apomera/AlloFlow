import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

// Exercise the actual pure positioning helper, without mounting the large
// reader or replacing its geometry algorithm with a test implementation.
const source=readFileSync(resolve(process.env.PREPARED_HELP_SOURCE_DIR||process.cwd(),'view_simplified_source.jsx'),'utf8');
const start=source.indexOf('  function simplifiedPopupStyle(');
const end=source.indexOf('  function useSimplifiedPopupViewport(',start);
if(start<0||end<0)throw new Error('Reader popup geometry helper was not found');
function style(viewport,fontSize=16,prepared=true) {
  const window={innerWidth:390,innerHeight:320,visualViewport:viewport,getComputedStyle:()=>({fontSize:String(fontSize)})};
  return new Function('window','document',source.slice(start,end)+'\nreturn simplifiedPopupStyle;')(window,{})(
    {x:2000,y:2000},20,prepared);
}
describe('Prepared card room on short visible viewports',()=>{
  it.each([
    {width:320,height:225,offsetLeft:0,offsetTop:0,font:16},
    {width:568,height:320,offsetLeft:0,offsetTop:0,font:32},
    {width:320,height:225,offsetLeft:45,offsetTop:80,font:16},
  ])('uses the available height without leaving a $width x $height viewport',viewport=>{
    const box=style(viewport,viewport.font);
    expect(parseFloat(box.maxHeight)).toBeGreaterThan(viewport.height*.85);
    expect(parseFloat(box.top)).toBeGreaterThanOrEqual(viewport.offsetTop);
    expect(parseFloat(box.top)+parseFloat(box.maxHeight)).toBeLessThanOrEqual(viewport.offsetTop+viewport.height);
    expect(parseFloat(box.left)).toBeGreaterThanOrEqual(viewport.offsetLeft);
    expect(parseFloat(box.left)+parseFloat(box.width)).toBeLessThanOrEqual(viewport.offsetLeft+viewport.width);
    expect(box.overflowY).toBe('auto');
  });
  it('keeps ordinary word lookup popup geometry unchanged',()=>{
    const viewport={width:320,height:225,offsetLeft:0,offsetTop:0};
    expect(parseFloat(style(viewport,16,false).maxHeight)).toBeLessThan(viewport.height/2);
  });
  it('keeps the anchored popup size on a roomy screen',()=>{
    const viewport={width:1280,height:900,offsetLeft:0,offsetTop:0};
    expect(style(viewport,16,true)).toEqual(style(viewport,16,false));
  });
  it('uses the window size when the visual viewport API is unavailable',()=>{
    const box=style(undefined);
    expect(parseFloat(box.maxHeight)).toBeGreaterThan(280);
    expect(parseFloat(box.top)+parseFloat(box.maxHeight)).toBeLessThanOrEqual(320);
  });
});
