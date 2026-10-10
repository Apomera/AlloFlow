const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const driver=fs.readFileSync(path.join(__dirname,'artifact-check.cjs'),'utf8');
const metrics=Function('assert','zlib',driver.slice(driver.indexOf('function pixels('),driver.indexOf('function probeInstall(){'))+'return{pixels,stats,difference};')(assert,zlib);
const record=JSON.parse(fs.readFileSync(path.join(__dirname,'artifact-report/check.json')));
console.log(JSON.stringify({failure:record.failure,captures:record.captures.map(c=>{const pic=metrics.pixels(fs.readFileSync(path.join(__dirname,'artifact-report',c.file))),counts=new Map();for(let i=0;i<pic.data.length;i+=pic.channels){const key=pic.data.subarray(i,i+3).join(',');counts.set(key,(counts.get(key)||0)+1);}return{name:c.name,phase:c.phase,statistics:c.statistics,marker:c.marker,uniqueColors:counts.size,topColors:[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5)};})},null,2));
