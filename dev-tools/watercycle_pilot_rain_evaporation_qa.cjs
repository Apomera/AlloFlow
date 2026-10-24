'use strict';
const defaults={suite:'rain-evaporation',sections:'rain-evaporation',captures:'rain-evaporation-thinning-water,rain-evaporation-first-water,rain-evaporation-middle-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
