'use strict';
// Source-born native snow curtains, using original-kernel release receipts.
// The root must freeze source and release the sole GPU slot before running.
const defaults={suite:'cloud-snow-onset',sections:'cloud-snow-onset',captures:'cloud-snow-onset-first-pause,cloud-snow-onset-growing-follow,cloud-snow-onset-water'};
for(const[key,value]of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
