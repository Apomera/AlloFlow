'use strict';
// Launch only after production source freeze and sole native GPU ownership.
const defaults={suite:'cloud-fringe-detail',sections:'cloud-fringe-detail',
 source:'reports/watercycle-pilot-cloud-fringe-detail/final-source.js',
 captures:'cloud-fringe-detail-sunward,cloud-fringe-detail-opposite,cloud-fringe-detail-release-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
