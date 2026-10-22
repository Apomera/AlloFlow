'use strict';
// Isolated genuine-kernel cloud-shelf emission and native receiving-water review.
// Root must freeze production source and release GPU ownership before this runs.
const defaults = {
  suite: 'rain-emission',
  sections: 'rain-emission',
  captures: 'rain-emission-early-follow,rain-emission-after-memory-follow,rain-emission-water-contacts'
};
for (const [key, value] of Object.entries(defaults)) {
  if (!process.argv.some(arg => arg.startsWith('--' + key + '='))) process.argv.push('--' + key + '=' + value);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
