const fs=require('node:fs');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
for(const [file,spans]of [['stem_lab/universe_flight_scene.js',[[1380,1430],[2470,2520]]]]){
 const lines=fs.readFileSync(root+'/'+file,'utf8').split(/\r?\n/);
 for(const [a,b]of spans)console.log(lines.slice(a-1,b).map((line,i)=>(a+i)+': '+line).join('\n'));
}
