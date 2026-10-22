'use strict';
// Run only after the source is frozen and the sole GPU slot is released.
const defaults={suite:'splash-motion',sections:'splash-motion',captures:'splash-motion-first-follow,splash-motion-middle-follow,splash-motion-late-follow'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
