'use strict';
const defaults={suite:'cloud-immersion',sections:'cloud-immersion',captures:'cloud-immersion-entry-middle-water,cloud-immersion-exit-first-water,cloud-immersion-exit-middle-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
