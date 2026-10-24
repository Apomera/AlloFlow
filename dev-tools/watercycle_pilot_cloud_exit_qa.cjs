'use strict';
// Actual pooled cloud-interior continuity across genuine rain/snow releases.
// Run only after root freezes the source and releases the sole GPU slot.
const defaults = { suite: 'cloud-exit', sections: 'cloud-exit',
  captures: 'cloud-exit-before-water,cloud-exit-first-rain-water,cloud-exit-middle-rain-water' };
for (const [key, value] of Object.entries(defaults)) {
  if (!process.argv.some(arg => arg.startsWith('--' + key + '='))) process.argv.push('--' + key + '=' + value);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
