const fs=require('node:fs'),file='reports/geometry-world-graphics-2026-09-08/verify-workspace-feedback.cjs';
let s=fs.readFileSync(file,'utf8');
s=s.replace("(m.formattedOccupiedVolume||m.formattedVolume);return __canvasTextTrace", "(m.formattedOccupiedVolume||m.formattedVolume)+'cu';return __canvasTextTrace");
s=s.replace("labels:__geoWorldEngine._dimLines", "gpu:Object.assign({},__geoWorldEngine.renderer.info.memory),labels:__geoWorldEngine._dimLines");
s=s.replace("({scale:o.scale.toArray(),texture:", "({text:o.userData.gwDimensionLabel,scale:o.scale.toArray(),texture:");
s=s.replace('[{width:1440,height:900},{width:390,height:844},{width:320,height:700}]','[{width:1440,height:900},{width:390,height:844},{width:320,height:700},{width:844,height:390,landscape:true}]');
s=s.replace("await page.locator('.gw-achievement-toast').waitFor();", "await page.locator('.gw-achievement-toast').waitFor({state:'attached'});");
const start=s.indexOf("   row.achievement=await hit(page.locator('.gw-achievement-toast'));");
const end=s.indexOf("   await page.getByRole('button',{name:'Open game settings",start);
if(start<0||end<0)throw Error('Expected achievement segment missing');
const portrait=s.slice(start,end);
s=s.slice(0,start)+"   if(size.landscape){check(!await page.locator('.gw-achievement-toast').isVisible(),label+': achievement is quiet in short landscape');await shot(label+'-dimensions');}else{\n"+portrait+"   }\n"+s.slice(end);
s=s.replace("  // A separate two-cube", "  check(results.viewports.slice(1).every(row=>row.measurement.gpu.textures===results.viewports[0].measurement.gpu.textures),'Repeated measurements keep a stable GPU texture count');\n  // A separate two-cube");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
