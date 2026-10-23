'use strict';
// Run only after root freezes production and releases the sole native GPU slot.
const defaults={suite:'cloud-interior-density',sections:'cloud-interior-density',
 source:'reports/watercycle-pilot-cloud-interior-density/final-source.js',
 captures:'cloud-interior-density-entry-middle-water,cloud-interior-density-exit-first-water,cloud-interior-density-exit-middle-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
