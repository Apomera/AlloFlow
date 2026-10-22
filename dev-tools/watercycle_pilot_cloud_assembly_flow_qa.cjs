'use strict';
// Root freezes production source before releasing the sole native GPU slot.
const defaults={suite:'cloud-assembly-flow',sections:'cloud-assembly-flow',
  captures:'cloud-assembly-flow-first-water,cloud-assembly-flow-middle-water,cloud-assembly-flow-middle-follow'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
