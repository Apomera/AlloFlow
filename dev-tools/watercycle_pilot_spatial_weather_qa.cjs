'use strict';
// One isolated browser, using the existing genuine-kernel native harness.
// Run only after root freezes source and authorizes the GPU review.
const defaults = {
  suite: 'spatial-weather',
  sections: 'cloud,rain-advection,phase',
  'cloud-distance': '130',
  'phase-routes': 'condensation,rainRelease',
  captures: 'cloud-shade-sunward,cloud-shade-opposite,cloud-opposite-legacy-order,rain-size-slants-water,condensation-water-midpoint,rainRelease-follow-midpoint'
};
for (const [key,value] of Object.entries(defaults)) {
  if (!process.argv.some(arg=>arg.startsWith('--'+key+'='))) process.argv.push('--'+key+'='+value);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
