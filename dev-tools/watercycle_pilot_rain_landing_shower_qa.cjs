'use strict';
// Run only after source freeze, focused units, CPU proof, and sole GPU ownership.
const defaults={suite:'rain-landing-shower',sections:'rain-landing-shower',captures:'rain-landing-shower-first-water,rain-landing-shower-middle-water,rain-landing-shower-late-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
