#!/usr/bin/env node
'use strict';

// Public AP framework topic ids, transcribed from the official Course and Exam
// Descriptions on 2026-09-06.
//
// Only the topic NUMBERING is recorded here. No topic titles, learning
// objectives, essential knowledge statements, or any other CED prose is
// reproduced: the numbering is the factual index a pack needs in order to state
// which public framework topics it targets, which is what
// `blueprint.officialFrameworkTopicIds` means in the packs that already declare
// one (Calculus AB, Statistics, U.S. Government, U.S. History).
//
// Each list below was verified two ways before being recorded: the id set was
// read out of the official CED PDF, and it was compared against the topic ids
// the pack's items already carry. All three matched exactly, so declaring the
// universe records what the pack already does rather than changing its scope.
//
// AP Physics 1 is deliberately absent. Its pack numbers topics on an internal
// scheme that does not correspond to the CED: the pack's "2.6 Circular Motion"
// is the CED's 2.9, its "3.4 Power" is the CED's 3.5, it carries a topic 4.5
// ("Collisions") where the CED's Unit 4 ends at 4.4, and it has no items for
// five real CED topics (2.8 Spring Forces, 2.9 Circular Motion, 5.6, 6.5, 6.6).
// Declaring an official universe for it would report a coverage figure against
// ids that do not mean what they appear to mean. It needs a crosswalk from its
// internal numbering to the framework first; see `topicIdScheme` on that pack.

const AP_FRAMEWORK_TOPIC_SOURCES = Object.freeze({
  'ap-biology-foundation-pilot': {
    cedLabel: 'AP Biology Course and Exam Description, Effective Fall 2025',
    url: 'https://apcentral.collegeboard.org/media/pdf/ap-biology-course-and-exam-description.pdf',
    transcribedAt: '2026-09-06',
    // Units 1-8. Topics per unit: 7, 10, 5, 6, 5, 8, 12, 7.
    topicsPerUnit: [7, 10, 5, 6, 5, 8, 12, 7],
  },
  'ap-chemistry-foundation-pilot': {
    cedLabel: 'AP Chemistry Course and Exam Description, Effective Fall 2024',
    url: 'https://apcentral.collegeboard.org/media/pdf/ap-chemistry-course-and-exam-description.pdf',
    transcribedAt: '2026-09-06',
    // Units 1-9. Topics per unit: 8, 7, 13, 9, 11, 9, 12, 11, 11.
    topicsPerUnit: [8, 7, 13, 9, 11, 9, 12, 11, 11],
  },
  'ap-psychology-pilot': {
    cedLabel: 'AP Psychology Course and Exam Description, Effective Fall 2025',
    url: 'https://apcentral.collegeboard.org/media/pdf/ap-psychology-course-and-exam-description.pdf',
    transcribedAt: '2026-09-06',
    // Units 1-5. Topics per unit: 6, 8, 9, 7, 5.
    topicsPerUnit: [6, 8, 9, 7, 5],
  },
});

function topicIdsFor(packId) {
  const source = AP_FRAMEWORK_TOPIC_SOURCES[packId];
  if (!source) return null;
  const ids = [];
  source.topicsPerUnit.forEach((count, index) => {
    for (let topic = 1; topic <= count; topic += 1) ids.push((index + 1) + '.' + topic);
  });
  return ids;
}

const AP_FRAMEWORK_TOPIC_IDS = Object.freeze(Object.keys(AP_FRAMEWORK_TOPIC_SOURCES)
  .reduce((all, packId) => Object.assign(all, { [packId]: Object.freeze(topicIdsFor(packId)) }), {}));

// The provenance stamp a pack records next to its declared topic ids.
function frameworkSourceFor(packId) {
  const source = AP_FRAMEWORK_TOPIC_SOURCES[packId];
  if (!source) return null;
  return {
    cedLabel: source.cedLabel,
    url: source.url,
    transcribedAt: source.transcribedAt,
    note: 'Public framework topic numbering only; no CED prose, titles, or learning objectives are reproduced.',
  };
}

// AP Physics 1's own numbering, recorded so its coverage reads as unmeasured
// rather than silently passing against ids that do not mean what they look like.
const AP_PHYSICS_1_TOPIC_SCHEME = Object.freeze({
  topicIdScheme: 'internal-pack-numbering',
  officialFrameworkTopicCountReference: 43,
  topicIdSchemeNote: 'Item topicIds use an internal numbering that does not correspond to the public AP Physics 1 framework topic numbers. Verified 2026-09-06 against the AP Physics 1: Algebra-Based Course and Exam Description, Effective Fall 2024: the pack’s 2.6 Circular Motion is framework 2.9, its 3.4 Power is framework 3.5, its 2.4 Gravitational Force is framework 2.6, and it carries a topic 4.5 where framework Unit 4 ends at 4.4. A draft label-based crosswalk in dev-tools/ap_physics_1_topic_crosswalk.cjs maps the pack’s 39 topics onto 37 of the 43 framework topics and leaves six with no mapped pack topic: 2.8 Spring Forces, 3.4 Conservation of Energy, 5.2 Connecting Linear and Rotational Motion, 5.6 Newton’s Second Law in Rotational Form, 6.2 Torque and Work, and 6.6 Motion of Orbiting Satellites. That crosswalk is a draft pending AP Physics subject-expert review, so no official framework topic universe is declared and framework coverage for this pack remains unmeasured.',
  topicCrosswalkModule: 'dev-tools/ap_physics_1_topic_crosswalk.cjs',
  topicCrosswalkStatus: 'draft-pending-subject-expert-review',
});

module.exports = { AP_FRAMEWORK_TOPIC_IDS, AP_FRAMEWORK_TOPIC_SOURCES, AP_PHYSICS_1_TOPIC_SCHEME, topicIdsFor, frameworkSourceFor };
