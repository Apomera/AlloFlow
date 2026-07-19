'use strict';

const assessmentResearch = require('./eppp_option_feedback_wave_10_assessment_research.cjs').revisions;
const bioCogLife = require('./eppp_option_feedback_wave_10_bio_cog_life.cjs').revisions;
const clinEthicsSocial = require('./eppp_option_feedback_wave_10_clin_ethics_social.cjs').revisions;

const groups = [assessmentResearch, bioCogLife, clinEthicsSocial];
const revisionEntries = groups.flatMap((group) => Object.entries(group));
const revisionIds = revisionEntries.map(([id]) => id);
if (new Set(revisionIds).size !== revisionIds.length) {
  throw new Error('Wave 10 group modules contain a duplicate item id.');
}

const revisions = Object.fromEntries(revisionEntries);

const wave09WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1421,
  incorrectOptionsWithWarnings: 4114,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2558,
  choiceRestatementOptions: 1839,
  fullKeyEchoOptions: 1564,
});

const wave10WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1405,
  incorrectOptionsWithWarnings: 4066,
  insufficientDetailOptions: 1481,
  genericTemplateOptions: 2522,
  choiceRestatementOptions: 1809,
  fullKeyEchoOptions: 1538,
});

module.exports = { revisions, wave09WarningSnapshot, wave10WarningSnapshot };
