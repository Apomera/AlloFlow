// Bounded final decorative refresh: only the phone landscape screenshot and hit checks.
const fs=require('node:fs');
let s=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-controls-views-pass.cjs','utf8');
s=s.replace("path.join(out,'controls-views-results.json')", "path.join(out,'controls-views-landscape-refresh-results.json')");
const start=s.indexOf('  await pose([8,2.5,0.5]'),end=s.indexOf('  for(const size of ',start);
s=s.slice(0,start)+'  const baseline=initial;\n'+s.slice(end);
s=s.replace('[{width:1440,height:900},{width:390,height:844},{width:320,height:700},{width:844,height:390,landscape:true}]','[{width:844,height:390,landscape:true}]');
const motionStart=s.indexOf('    const beforeMotion=await signature()'),motionEnd=s.indexOf('    await pose([10,8,13]',motionStart);
s=s.slice(0,motionStart)+`    row.reticle=await page.locator('.gw-touch-look-zone').evaluate(node=>({display:getComputedStyle(node).display,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}));check(row.reticle.display==='none'&&row.reticle.width===0,'Landscape decorative reticle is hidden');
`+s.slice(motionEnd);
eval(s);
