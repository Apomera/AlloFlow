'use strict';
// Root freezes production and explicitly releases the sole native GPU slot.
const defaults={suite:'refreezing-continuity',sections:'refreezing-continuity',
 captures:'refreezing-continuity-melting-water,refreezing-continuity-first-water,refreezing-continuity-middle-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
