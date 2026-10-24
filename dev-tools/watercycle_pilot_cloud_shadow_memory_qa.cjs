'use strict';
// Actual receiver-shader continuity through a genuine interrupted cloud.
// Root must freeze the source and release the sole native GPU slot first.
const defaults = { suite: 'cloud-shadow-memory', sections: 'cloud-shadow-memory',
  captures: 'cloud-shadow-memory-cloud-overview,cloud-shadow-memory-first-rain-overview,cloud-shadow-memory-middle-overview' };
for (const [key, value] of Object.entries(defaults)) {
  if (!process.argv.some(arg => arg.startsWith('--' + key + '='))) process.argv.push('--' + key + '=' + value);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
