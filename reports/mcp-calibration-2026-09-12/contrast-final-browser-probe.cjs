const fs=require('node:fs');const {chromium}=require('playwright');
(async()=>{
 const source=fs.readFileSync('doc_pipeline_source.jsx','utf8');const start=source.indexOf('const fixContrastViolations = (htmlContent) => {');const fn=source.slice(start,source.indexOf('\n  };',start)+4);
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();
 const result=await page.evaluate(({fn})=>{
  const fix=new Function('warnLog',fn+';return fixContrastViolations;')(()=>{});
  const lum=v=>v.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const ratio=(fg,bg)=>(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);
  return ['#ffffff','#737373'].flatMap(foreground=>{
   const html='<html><head></head><body>'+[['Replace','#475569'],['Upload image','#1d4ed8'],['Pick extracted','#7c3aed']].map(([text,bg])=>`<label style="background:${bg};color:white"><span style="color:${foreground} !important">${text}</span></label>`).join('')+'</body></html>';
   document.documentElement.innerHTML=fix(html).html;
   return [...document.querySelectorAll('label')].map(label=>{const color=getComputedStyle(label.querySelector('span')).color;const background=getComputedStyle(label).backgroundColor;return{text:label.textContent,input:foreground,color,ratio:Number(ratio(color,background).toFixed(2))}});
  });
 },{fn});await browser.close();if(result.some(r=>r.ratio<4.5))throw new Error(JSON.stringify(result));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
