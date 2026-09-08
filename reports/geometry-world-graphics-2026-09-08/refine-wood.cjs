const fs=require('node:fs');const p='stem_lab/stem_tool_geometryworld.js';let s=fs.readFileSync(p,'utf8');
const start=s.indexOf('        function makeWoodTexture() {'),end=s.indexOf('        function makeSandTexture()',start);
if(start<0||end<0)throw Error('Wood texture anchors missing');
let wood=s.slice(start,end);
wood=wood.replace("ctx.strokeStyle = 'rgba(90,50,30,0.35)'; ctx.lineWidth = 1;", "ctx.strokeStyle = 'rgba(90,50,30,0.20)'; ctx.lineWidth = 0.65;");
wood=wood.replace('// Knot (occasional dark oval)', '// A small, quiet knot avoids a repeating dark stamp on large builds.');
wood=wood.replace("ctx.fillStyle = 'rgba(70,40,20,0.4)';", "ctx.fillStyle = 'rgba(70,40,20,0.18)';");
wood=wood.replace('24, 4, 6, random()', '24, 1.6, 3, random()');
s=s.slice(0,start)+wood+s.slice(end);
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
console.log('Softened wood grain and repeating knot contrast.');
