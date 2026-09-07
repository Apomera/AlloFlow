#!/usr/bin/env node
'use strict';

// Draft crosswalk: AP Physics 1 pack topic numbering -> public framework topic
// numbering.
//
// The pack numbers its topics on an internal scheme whose ids look like
// framework ids but index different topics (its 2.6 "Circular Motion" is
// framework 2.9). Until the two are related, framework coverage for this pack
// cannot be measured at all. This file relates them.
//
// Framework titles are transcribed from the AP Physics 1: Algebra-Based Course
// and Exam Description, Effective Fall 2024 (43 topics), on 2026-09-06. Only
// topic numbering and titles are recorded; no CED prose, learning objectives, or
// essential knowledge statements are reproduced.
//
// EVERY ROW CARRIES A CONFIDENCE, AND THE FILE IS A DRAFT. `exact` and `high`
// rows match on title. `inferred` rows are a judgement call about which
// framework topic the pack's content belongs to, and they are the reason this
// crosswalk is not yet authoritative: an AP Physics subject expert has to
// confirm them before any framework-coverage figure derived from this file is
// published or shown to a learner. `unmapped` rows are pack topics with no
// framework counterpart at all.

const AP_PHYSICS_1_FRAMEWORK_TOPICS = Object.freeze({
  '1.1': 'Scalars and Vectors in One Dimension',
  '1.2': 'Displacement, Velocity, and Acceleration',
  '1.3': 'Representing Motion',
  '1.4': 'Reference Frames and Relative Motion',
  '1.5': 'Vectors and Motion in Two Dimensions',
  '2.1': 'Systems and Center of Mass',
  '2.2': 'Forces and Free-Body Diagrams',
  '2.3': "Newton's Third Law",
  '2.4': "Newton's First Law",
  '2.5': "Newton's Second Law",
  '2.6': 'Gravitational Force',
  '2.7': 'Kinetic and Static Friction',
  '2.8': 'Spring Forces',
  '2.9': 'Circular Motion',
  '3.1': 'Translational Kinetic Energy',
  '3.2': 'Work',
  '3.3': 'Potential Energy',
  '3.4': 'Conservation of Energy',
  '3.5': 'Power',
  '4.1': 'Linear Momentum',
  '4.2': 'Change in Momentum and Impulse',
  '4.3': 'Conservation of Linear Momentum',
  '4.4': 'Elastic and Inelastic Collisions',
  '5.1': 'Rotational Kinematics',
  '5.2': 'Connecting Linear and Rotational Motion',
  '5.3': 'Torque',
  '5.4': 'Rotational Inertia',
  '5.5': "Rotational Equilibrium and Newton's First Law in Rotational Form",
  '5.6': "Newton's Second Law in Rotational Form",
  '6.1': 'Rotational Kinetic Energy',
  '6.2': 'Torque and Work',
  '6.3': 'Angular Momentum and Angular Impulse',
  '6.4': 'Conservation of Angular Momentum',
  '6.5': 'Rolling',
  '6.6': 'Motion of Orbiting Satellites',
  '7.1': 'Defining Simple Harmonic Motion (SHM)',
  '7.2': 'Frequency and Period of SHM',
  '7.3': 'Representing and Analyzing SHM',
  '7.4': 'Energy of Simple Harmonic Oscillators',
  '8.1': 'Internal Structure and Density',
  '8.2': 'Pressure',
  '8.3': "Fluids and Newton's Laws",
  '8.4': 'Fluids and Conservation Laws',
});

// packTopicId -> { frameworkTopicIds, confidence, note }
const AP_PHYSICS_1_CROSSWALK = Object.freeze([
  { pack: '1.1', packLabel: 'Scalars and Vectors', framework: ['1.1'], confidence: 'exact' },
  { pack: '1.2', packLabel: 'Representing Motion', framework: ['1.3'], confidence: 'exact' },
  { pack: '1.3', packLabel: 'Reference Frames and Relative Motion', framework: ['1.4'], confidence: 'exact' },
  { pack: '1.4', packLabel: 'Representing Motion in One Dimension', framework: ['1.2'], confidence: 'inferred', note: 'One-dimensional kinematics; framework 1.2 is Displacement, Velocity, and Acceleration.' },
  { pack: '1.5', packLabel: 'Motion in Two Dimensions', framework: ['1.5'], confidence: 'high', note: 'Framework 1.5 is Vectors and Motion in Two Dimensions.' },
  { pack: '2.1', packLabel: 'Systems and Center of Mass', framework: ['2.1'], confidence: 'exact' },
  { pack: '2.2', packLabel: 'Forces', framework: ['2.2'], confidence: 'high', note: 'Framework 2.2 is Forces and Free-Body Diagrams.' },
  { pack: '2.3', packLabel: 'Newton Laws', framework: ['2.3', '2.4', '2.5'], confidence: 'inferred', note: 'One pack topic spans three framework topics (Third, First, and Second Law). Coverage of each individually is not established by this row.' },
  { pack: '2.4', packLabel: 'Gravitational Force', framework: ['2.6'], confidence: 'exact' },
  { pack: '2.5', packLabel: 'Friction', framework: ['2.7'], confidence: 'high', note: 'Framework 2.7 is Kinetic and Static Friction.' },
  { pack: '2.6', packLabel: 'Circular Motion', framework: ['2.9'], confidence: 'exact' },
  { pack: '2.7', packLabel: 'Drag Forces', framework: [], confidence: 'unmapped', note: 'Drag is not a separate topic in the current framework. Review whether these items belong under another topic or are out of scope.' },
  { pack: '3.1', packLabel: 'Systems and Energy', framework: ['3.1'], confidence: 'inferred', note: 'Framework 3.1 is Translational Kinetic Energy; the pack topic is broader.' },
  { pack: '3.2', packLabel: 'Work', framework: ['3.2'], confidence: 'exact' },
  { pack: '3.3', packLabel: 'Work-Energy Theorem', framework: ['3.1', '3.2'], confidence: 'inferred', note: 'The framework treats the work-energy relationship across kinetic energy and work rather than as its own topic.' },
  { pack: '3.4', packLabel: 'Power', framework: ['3.5'], confidence: 'exact' },
  { pack: '3.5', packLabel: 'Energy in Springs', framework: ['3.3'], confidence: 'inferred', note: 'Elastic potential energy sits under framework 3.3 Potential Energy.' },
  { pack: '4.1', packLabel: 'Center of Mass', framework: ['2.1'], confidence: 'inferred', note: 'Center of mass is framework 2.1, in the forces unit, not the momentum unit. Overlaps pack 2.1.' },
  { pack: '4.2', packLabel: 'Representations of Momentum', framework: ['4.1'], confidence: 'high', note: 'Framework 4.1 is Linear Momentum.' },
  { pack: '4.3', packLabel: 'Impulse', framework: ['4.2'], confidence: 'high', note: 'Framework 4.2 is Change in Momentum and Impulse.' },
  { pack: '4.4', packLabel: 'Conservation of Linear Momentum', framework: ['4.3'], confidence: 'exact' },
  { pack: '4.5', packLabel: 'Collisions', framework: ['4.4'], confidence: 'high', note: 'Framework 4.4 is Elastic and Inelastic Collisions. This pack id has no framework counterpart at 4.5.' },
  { pack: '5.1', packLabel: 'Rotational Kinematics', framework: ['5.1'], confidence: 'exact' },
  { pack: '5.2', packLabel: 'Torque', framework: ['5.3'], confidence: 'exact' },
  { pack: '5.3', packLabel: 'Rotational Inertia', framework: ['5.4'], confidence: 'exact' },
  { pack: '5.4', packLabel: 'Rotational Equilibrium', framework: ['5.5'], confidence: 'high', note: "Framework 5.5 is Rotational Equilibrium and Newton's First Law in Rotational Form." },
  { pack: '5.5', packLabel: 'Angular Momentum', framework: ['6.3'], confidence: 'inferred', note: 'Angular momentum sits in framework Unit 6, not Unit 5. Overlaps pack 6.3.' },
  { pack: '6.1', packLabel: 'Rotational Kinetic Energy', framework: ['6.1'], confidence: 'exact' },
  { pack: '6.2', packLabel: 'Rolling', framework: ['6.5'], confidence: 'exact' },
  { pack: '6.3', packLabel: 'Angular Momentum of Rotating Systems', framework: ['6.3'], confidence: 'high', note: 'Framework 6.3 is Angular Momentum and Angular Impulse. Overlaps pack 5.5.' },
  { pack: '6.4', packLabel: 'Conservation in Rotating Systems', framework: ['6.4'], confidence: 'high', note: 'Framework 6.4 is Conservation of Angular Momentum.' },
  { pack: '7.1', packLabel: 'Introduction to Oscillations', framework: ['7.1'], confidence: 'high', note: 'Framework 7.1 is Defining Simple Harmonic Motion (SHM).' },
  { pack: '7.2', packLabel: 'Frequency and Period', framework: ['7.2'], confidence: 'exact' },
  { pack: '7.3', packLabel: 'Representing Oscillations', framework: ['7.3'], confidence: 'high', note: 'Framework 7.3 is Representing and Analyzing SHM.' },
  { pack: '7.4', packLabel: 'Energy of Oscillators', framework: ['7.4'], confidence: 'high', note: 'Framework 7.4 is Energy of Simple Harmonic Oscillators.' },
  { pack: '8.1', packLabel: 'Internal Structure and Density', framework: ['8.1'], confidence: 'exact' },
  { pack: '8.2', packLabel: 'Pressure', framework: ['8.2'], confidence: 'exact' },
  { pack: '8.3', packLabel: 'Fluids and Newton Laws', framework: ['8.3'], confidence: 'exact' },
  { pack: '8.4', packLabel: 'Fluids and Conservation Laws', framework: ['8.4'], confidence: 'exact' },
]);

function buildCrosswalkSummary() {
  const frameworkIds = Object.keys(AP_PHYSICS_1_FRAMEWORK_TOPICS);
  const mapped = new Set();
  AP_PHYSICS_1_CROSSWALK.forEach((row) => row.framework.forEach((id) => mapped.add(id)));
  const uncovered = frameworkIds.filter((id) => !mapped.has(id));
  const byConfidence = AP_PHYSICS_1_CROSSWALK.reduce((counts, row) => {
    counts[row.confidence] = (counts[row.confidence] || 0) + 1;
    return counts;
  }, {});
  // A pack topic mapped onto several framework topics does not demonstrate
  // coverage of each of them, so those rows are counted separately.
  const oneToMany = AP_PHYSICS_1_CROSSWALK.filter((row) => row.framework.length > 1).map((row) => row.pack);
  const duplicated = {};
  AP_PHYSICS_1_CROSSWALK.forEach((row) => row.framework.forEach((id) => {
    duplicated[id] = (duplicated[id] || 0) + 1;
  }));
  return {
    schemaVersion: 1,
    status: 'draft-pending-subject-expert-review',
    cedLabel: 'AP Physics 1: Algebra-Based Course and Exam Description, Effective Fall 2024',
    transcribedAt: '2026-09-06',
    frameworkTopicCount: frameworkIds.length,
    packTopicCount: AP_PHYSICS_1_CROSSWALK.length,
    mappedFrameworkTopicCount: mapped.size,
    uncoveredFrameworkTopicIds: uncovered,
    uncoveredFrameworkTopics: uncovered.map((id) => id + ' ' + AP_PHYSICS_1_FRAMEWORK_TOPICS[id]),
    rowsByConfidence: byConfidence,
    oneToManyPackTopics: oneToMany,
    frameworkTopicsClaimedByMultiplePackTopics: Object.keys(duplicated).filter((id) => duplicated[id] > 1),
    boundary: 'Draft structural mapping only. Rows marked inferred are judgement calls that require AP Physics subject-expert confirmation. No framework-coverage figure from this file may be published, shown to a learner, or treated as a readiness or completeness claim until that review is recorded.',
  };
}

module.exports = { AP_PHYSICS_1_FRAMEWORK_TOPICS, AP_PHYSICS_1_CROSSWALK, buildCrosswalkSummary };

if (require.main === module) {
  const summary = buildCrosswalkSummary();
  console.log(JSON.stringify(summary, null, 2));
}
