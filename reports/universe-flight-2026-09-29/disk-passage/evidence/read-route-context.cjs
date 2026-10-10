const fs=require('node:fs');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const source=fs.readFileSync(repo+'/stem_lab/universe_flight_scene.js','utf8').split(/\r?\n/);
for(const[a,b]of[[234,510],[3360,3540]])console.log(source.slice(a-1,b).map((line,i)=>(a+i)+': '+line).join('\n'));
const tests=fs.readFileSync(repo+'/tests/universe_flight_navigation.test.js','utf8').split(/\r?\n/);
for(const[a,b]of[[1,175],[1750,1800],[2098,2130],[3348,3456]])console.log(tests.slice(a-1,b).map((line,i)=>(a+i)+': '+line).join('\n'));
