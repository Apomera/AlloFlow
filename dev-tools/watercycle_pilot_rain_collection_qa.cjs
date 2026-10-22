'use strict';
// Genuine-kernel collection continuity on ocean, lake and stream receivers.
// Root must freeze source and release the sole GPU/browser slot before running.
const defaults = {
  suite: 'rain-collection',
  sections: 'rain-collection',
  captures: 'rain-collection-ocean-follow,rain-collection-lake-water,rain-collection-stream-follow'
};
for (const [key, value] of Object.entries(defaults)) {
  if (!process.argv.some(arg => arg.startsWith('--' + key + '='))) process.argv.push('--' + key + '=' + value);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
