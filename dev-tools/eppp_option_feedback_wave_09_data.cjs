'use strict';

const assessmentResearch = require('./eppp_option_feedback_wave_09_assessment_research.cjs').revisions;
const bioCogLife = require('./eppp_option_feedback_wave_09_bio_cog_life.cjs').revisions;
const clinEthicsSocial = require('./eppp_option_feedback_wave_09_clin_ethics_social.cjs').revisions;

const groups = [assessmentResearch, bioCogLife, clinEthicsSocial];
const revisionEntries = groups.flatMap((group) => Object.entries(group));
const revisionIds = revisionEntries.map(([id]) => id);
if (new Set(revisionIds).size !== revisionIds.length) {
  throw new Error('Wave 09 group modules contain a duplicate item id.');
}

const revisions = Object.fromEntries(revisionEntries);

// Immutable snapshot produced by the completed wave-08 diagnostics. It keeps
// the historical before/after comparison reproducible when this repair is
// rerun after later waves have changed the live bank.
const wave08WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1437,
  incorrectOptionsWithWarnings: 4162,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2606,
  choiceRestatementOptions: 1887,
  fullKeyEchoOptions: 1612,
});

module.exports = { revisions, wave08WarningSnapshot };
