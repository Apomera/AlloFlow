'use strict';
// Genuine falling-snow melt, with full native rain-preview transforms.
// Run only after frozen source, CPU checks and sole GPU ownership are confirmed.
const defaults={suite:'snow-melt-preview',sections:'snow-melt-preview',captures:'snow-melt-preview-first-water,snow-melt-preview-middle-water,snow-melt-preview-middle-follow'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
