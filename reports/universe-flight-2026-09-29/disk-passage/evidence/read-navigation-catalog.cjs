const fs=require('node:fs');
const source=fs.readFileSync('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/universe_flight_navigation.test.js','utf8').split(/\r?\n/);
for(const[a,b]of[[1720,1748],[2318,2397],[2988,3043],[3260,3288]])console.log(source.slice(a-1,b).map((line,i)=>(a+i)+': '+line).join('\n'));
