'use strict';
// Genuine cloud release: source-born curtain, native receiving-water contacts,
// reduced motion, and active-source reset. Run only with root's GPU release.
const defaults = { suite: 'rain-onset', sections: 'rain-onset',
  captures: 'rain-onset-first-pause,rain-onset-growing-follow,rain-onset-water-arrival' };
for (const [key, value] of Object.entries(defaults)) {
  if (!process.argv.some(arg => arg.startsWith('--' + key + '='))) process.argv.push('--' + key + '=' + value);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
