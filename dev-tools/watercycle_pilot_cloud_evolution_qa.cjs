'use strict';
// Isolated genuine-kernel cloud formation and convective-motion native review.
// Root must freeze source and release GPU ownership before this runs.
const defaults = {
  suite: 'cloud-evolution',
  sections: 'cloud-evolution',
  captures: 'cloud-assembly-early-follow,cloud-assembly-middle-follow,cloud-assembly-middle-water,cloud-assembly-late-water,cloud-assembly-rapid-rain-follow'
};
for (const [key, value] of Object.entries(defaults)) {
  if (!process.argv.some(arg => arg.startsWith('--' + key + '='))) process.argv.push('--' + key + '=' + value);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
