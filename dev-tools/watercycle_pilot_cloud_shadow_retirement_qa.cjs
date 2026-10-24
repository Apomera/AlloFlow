'use strict';
// Root freezes production and releases the sole native GPU slot before launch.
const defaults={suite:'cloud-shadow-retirement',sections:'cloud-shadow-retirement',
 source:'reports/watercycle-pilot-cloud-shadow-retirement/final-source.js',
 captures:'cloud-shadow-retirement-first-follow,cloud-shadow-retirement-middle-follow,cloud-shadow-retirement-late-follow'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
