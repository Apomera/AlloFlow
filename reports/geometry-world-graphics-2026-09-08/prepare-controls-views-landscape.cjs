const fs=require('node:fs');
const file='reports/geometry-world-graphics-2026-09-08/verify-controls-views-pass.cjs';
let s=fs.readFileSync(file,'utf8');
s=s.replace("name:/^(Fly up|Jump)$/", "name:'Jump or fly up',exact:true");
s=s.replace('{width:320,height:700}])','{width:320,height:700},{width:844,height:390,landscape:true}])');
s=s.replace('if(size.width<800){','if(size.width<800||size.landscape){');
s=s.replace("const beforeMotion=await signature(),up=", `row.joystickOverlaps=await page.evaluate(()=>{const stick=document.querySelector('.gw-touch-joystick'),b=stick.getBoundingClientRect(),found=[];for(const selector of ['.gw-hotbar','.gw-shape-tray','.gwe-builder-dock','.gw-touch-look-panel','.gw-touch-actions']){const node=document.querySelector(selector);if(!node||getComputedStyle(node).visibility==='hidden')continue;const r=node.getBoundingClientRect(),w=Math.min(b.right,r.right)-Math.max(b.left,r.left),h=Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top);if(w>1&&h>1)found.push({selector,area:w*h,joystick:{x:b.x,y:b.y,width:b.width,height:b.height}});}return found;});check(row.joystickOverlaps.length===0,label+': joystick does not overlap palette, shapes, build dock, look settings or touch actions');
    const beforeMotion=await signature(),up=`);
s=s.replace("   await collapse(false);const showcase=", "   if(size.landscape)continue;\n   await collapse(false);const showcase=");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
