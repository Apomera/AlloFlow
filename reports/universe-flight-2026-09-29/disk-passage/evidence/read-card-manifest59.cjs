'use strict';
const fs=require('node:fs');
const m=JSON.parse(fs.readFileSync('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/assets/universe-flight/highlights/manifest.json','utf8'));
console.log(JSON.stringify(Object.fromEntries(Object.entries(m).map(([key,v])=>[key,Array.isArray(v)?{length:v.length,first:v[0],disk:v.filter(item=>JSON.stringify(item).includes('disk'))}:v])),null,2));
