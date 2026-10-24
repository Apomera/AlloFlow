'use strict';
// Launch only after root freezes production and releases the sole native slot.
const defaults={suite:'phase-motion-continuity',sections:'phase-motion-continuity',
 source:'reports/watercycle-pilot-phase-motion-continuity/final-source.js',
 captures:'phase-motion-continuity-collection-held-water,phase-motion-continuity-melting-held-water,phase-motion-continuity-evaporation-held-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
