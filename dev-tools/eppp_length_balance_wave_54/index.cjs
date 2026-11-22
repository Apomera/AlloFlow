'use strict';

const part1 = require('./part1.cjs');
const part2 = require('./part2.cjs');
const part3 = require('./part3.cjs');

const revisions = [...part1, ...part2, ...part3];
const seen = new Set();
for (const rev of revisions) {
  if (!rev || typeof rev.id !== 'string' || seen.has(rev.id)) {
    throw new Error(`Duplicate or invalid EPPP wave 54 revision id: ${rev && rev.id}`);
  }
  if (!Array.isArray(rev.choices) || rev.choices.length !== 4) {
    throw new Error(`EPPP wave 54 revision ${rev.id} must have 4 choices.`);
  }
  if (!Number.isInteger(rev.answerIndex) || rev.answerIndex < 0 || rev.answerIndex > 3) {
    throw new Error(`EPPP wave 54 revision ${rev.id} has invalid answerIndex.`);
  }
  seen.add(rev.id);
}

module.exports = {
  reviewWave: 'eppp-length-balance-wave-54',
  reviewedAt: '2026-11-21',
  revisions,
};
