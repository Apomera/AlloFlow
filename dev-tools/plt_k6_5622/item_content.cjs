'use strict';

const { sources } = require('./sources.cjs');
const domain1 = require('./domain1_learners.cjs');
const domain2 = require('./domain2_instruction.cjs');
const domain3 = require('./domain3_assessment.cjs');
const domain4 = require('./domain4_professional.cjs');

module.exports = [
  ...domain1,
  ...domain2,
  ...domain3,
  ...domain4,
];

module.exports.sources = sources;
