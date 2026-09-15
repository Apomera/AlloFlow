const fs=require('node:fs'),path=require('node:path'),d=__dirname;
let s=fs.readFileSync(path.join(d,'browser-resolved.cjs'),'utf8');
const mark="await page.getByRole('button',{name:'Geometry World home',exact:true}).click();";
const from=s.indexOf(mark),to=s.indexOf('}catch(e)',from),start=s.indexOf('try{');
if(from<0||to<0||start<0)throw Error('Expected browser sections missing');
const section=s.slice(from+mark.length,to).replace("__geoWorldEngine._currentLesson.id==='areaSurface'","__geoWorldEngine._currentLesson.title==='Area & Surface Area'");
s=s.slice(0,start)+'try{await page.goto("http://127.0.0.1:"+server.address().port);await page.waitForFunction(()=>!!window.__geoWorldEngine,null,{timeout:60000});'+section+s.slice(to);
s=s.replaceAll('browser-resolved.json','browser-stable-layout.json').replaceAll('failure-final-print-camera.png','failure-final-stable-layout.png');
fs.writeFileSync(path.join(d,'browser-stable-layout.cjs'),s);console.log('Prepared stable-width layout-only verification');
