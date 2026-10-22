'use strict';
// Root freezes production and explicitly releases the sole native GPU slot.
const defaults={suite:'cloud-source-thinning',sections:'cloud-source-thinning',
 captures:'cloud-source-thinning-first-water,cloud-source-thinning-middle-water,cloud-source-thinning-snow-middle-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
