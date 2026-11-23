'use strict';

// EPPP Part 1 Length-Balance & Warning Cleanup Wave 56 — 81 strictly unpinned
// items (72 key>=maxD incl. 17 severe >= 1.25x, plus 12 editorial warning items),
// bringing EPPP Part 1 key=longest from 498/1500 (33.2%) down to 426/1500 (28.4%).
const part1 = require('./part1.cjs');
const part2 = require('./part2.cjs');
const part3 = require('./part3.cjs');

module.exports = {
  reviewedAt: '2026-11-21',
  reviewWave: 'eppp-length-balance-wave-56',
  revisions: [...part1, ...part2, ...part3],
};
