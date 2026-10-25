'use strict';
// Run only after source freeze and sole native GPU ownership.
const defaults={suite:'rain-source-footprint',sections:'rain-source-footprint',captures:'rain-source-footprint-shower-water,rain-source-footprint-surface-water,rain-source-footprint-landing-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
