import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start()); test.afterAll(()=>harness.stop()); test.afterEach(async({page})=>harness.destroy(page));
test.use({deviceScaleFactor:2});
for(const [type,key,width] of [['animal','mitochondria',1200],['plant','chloroplast',1200],['bacterium','plasmid',1200],['plant','smoothER',390],['animal','nucleus',390],['bacterium','cellMembrane',320]] as const){
  test('illustrated '+type+' '+key+' at '+width,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height:960});
    await harness.mount(page,{cell:{mode:'interior',interiorCellType:type,interiorSel:key,interiorPaused:true,interiorStudyFocus:true}},undefined,{expectCanvas:false});
    await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
    const detail=page.locator('[data-cell-structure-detail]');await expect(detail).toHaveAttribute('data-cell-structure-detail',key);
    const canvas=detail.locator('canvas'); await expect(canvas).toHaveAttribute('width','640');
    const colors=await canvas.evaluate((cv:HTMLCanvasElement)=>{
      const pixels=cv.getContext('2d')!.getImageData(0,0,cv.width,cv.height).data;const palette=new Set<number>();
      for(let i=0;i<pixels.length;i+=32)if(pixels[i+3]>200)palette.add((pixels[i]<<16)+(pixels[i+1]<<8)+pixels[i+2]);return palette.size;
    });expect(colors).toBeGreaterThan(40);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const picker=page.locator('[data-cell-structure-picker]');
    const label=await page.evaluate(k=>(window as any).__alloCellPure.CELL_ORGANELLES[k].name,key);
    await picker.getByRole('button',{name:label,exact:false}).click();
    await expect(detail).toHaveAttribute('data-cell-structure-detail',key);
    await page.locator('[data-cell-interior-workspace]').scrollIntoViewIfNeeded();
    await page.screenshot({scale:'css',path:'reports/cell-illustration-pass/'+type+'-'+key+'-'+width+'.png',fullPage:true});
    await detail.screenshot({scale:'css',path:'reports/cell-illustration-pass/detail-'+type+'-'+key+'.png'});
    expect(errors).toEqual([]);
  });
}
