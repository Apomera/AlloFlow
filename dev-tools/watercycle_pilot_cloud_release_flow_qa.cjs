'use strict';
// Root freezes production and releases the sole native GPU slot before launch.
const defaults={suite:'cloud-release-flow',sections:'cloud-release-flow',
 source:'reports/watercycle-pilot-cloud-release-flow/final-source.js',
 captures:'cloud-release-flow-first-water-rain,cloud-release-flow-middle-water-rain,cloud-release-flow-late-follow-snow'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
