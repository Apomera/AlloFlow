const fs=require('node:fs');
for(const name of ['browser','inventory']){
 const file=__dirname+'/'+name+'.cjs';let s=fs.readFileSync(file,'utf8');
 s=s.replaceAll("'spanish'","'spanish_latin_america'");
 if(name==='browser'){
  s=s.replace("await state({complexity:1},grade)","await state({complexity:Number(grade)<=5?1:Number(grade)<=8?2:3},grade)");
  s=s.replace("healthyNote:content.includes('Staying Healthy')","healthyNote:content.toLowerCase().includes('staying healthy')");
  s=s.replace("system:'urinary'","system:'organs'");
  s=s.replace("await screenshot('phone-'+width+'-waves'", "if(width===390)evidence.waveStyles=await page.locator('[data-review-section=\"waves\"] .font-black').evaluateAll(nodes=>nodes.map(n=>{const ancestors=[];for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);ancestors.push({tag:p.tagName,class:p.className,color:s.color,bg:s.backgroundColor,image:s.backgroundImage,filter:s.filter,opacity:s.opacity});}return {text:n.textContent,ancestors};}));await screenshot('phone-'+width+'-waves'");
 }
 fs.writeFileSync(file,s);
}
