'use strict';
const defaults={suite:'cloud-formation-settle',sections:'cloud-formation-settle',captures:'cloud-formation-settle-middle-water,cloud-formation-settle-late-water,cloud-formation-settle-mature-follow'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
