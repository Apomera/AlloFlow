'use strict';
// Root freezes the production source and releases the sole native GPU slot.
const defaults={suite:'cloud-assembly-source',sections:'cloud-assembly-source',
  captures:'cloud-assembly-source-first-water,cloud-assembly-source-middle-water,cloud-assembly-source-middle-follow'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
