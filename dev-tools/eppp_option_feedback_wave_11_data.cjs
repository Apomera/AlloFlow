'use strict';

const assessmentResearch = require('./eppp_option_feedback_wave_11_assessment_research.cjs').revisions;
const bioCogLife = require('./eppp_option_feedback_wave_11_bio_cog_life.cjs').revisions;
const clinEthicsSocial = require('./eppp_option_feedback_wave_11_clin_ethics_social.cjs').revisions;

const groups = [assessmentResearch, bioCogLife, clinEthicsSocial];
const revisionEntries = groups.flatMap((group) => Object.entries(group));
const revisionIds = revisionEntries.map(([id]) => id);
if (new Set(revisionIds).size !== revisionIds.length) {
  throw new Error('Wave 11 group modules contain a duplicate item id.');
}

const revisions = Object.fromEntries(revisionEntries);

const wave10WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1405,
  incorrectOptionsWithWarnings: 4066,
  insufficientDetailOptions: 1481,
  genericTemplateOptions: 2522,
  choiceRestatementOptions: 1809,
  fullKeyEchoOptions: 1538,
});

const wave11WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1389,
  incorrectOptionsWithWarnings: 4018,
  insufficientDetailOptions: 1465,
  genericTemplateOptions: 2474,
  choiceRestatementOptions: 1767,
  fullKeyEchoOptions: 1517,
});

module.exports = { revisions, wave10WarningSnapshot, wave11WarningSnapshot };
