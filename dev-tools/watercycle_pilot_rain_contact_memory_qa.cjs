'use strict';
// Native receiver anchoring through real rain descent and collection.
// Run only after the root freezes source and releases the sole GPU slot.
const defaults = {suite:'rain-contact-memory',sections:'rain-contact-memory',captures:'rain-contact-memory-before-steering,rain-contact-memory-after-steering'};
for(const [key,value] of Object.entries(defaults))if(!process.argv.some(arg=>arg.startsWith('--'+key+'=')))process.argv.push('--'+key+'='+value);
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
