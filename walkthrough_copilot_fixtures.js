/*
 * AlloFlow Walkthrough Copilot - framework configurations and synthetic fixtures.
 *
 * FRAMEWORK CONFIGURATIONS
 *
 * These carry domain and component STRUCTURE only. No performance-level rubric
 * language appears here, and none should be added. The rubric descriptors that
 * distinguish one performance level from another are the substantial expression
 * in a published framework and are the district's to supply, under whatever
 * license or local authorship applies to them.
 *
 * The Portland structure below is transcribed from Portland Public Schools'
 * publicly posted educator evaluation guidebook, which describes The Portland
 * Framework for Teaching as a local adaptation of the Danielson framework with
 * four domains and twenty-two components. Confirm it against the district's
 * current Performance Evaluation and Professional Growth System Guidebook
 * before any real use; that document is not published and must be requested.
 *
 * SYNTHETIC FIXTURES
 *
 * Every fixture is invented. No real educator, student, school, lesson, or
 * observation is represented. Names are deliberately generic placeholders.
 */
(function () {
  'use strict';

  var PORTLAND_FRAMEWORK = {
    id: 'portland-framework-for-teaching',
    label: 'The Portland Framework for Teaching (structure only)',
    domains: [
      { id: 'd1', label: 'Domain 1: Planning and Preparation' },
      { id: 'd2', label: 'Domain 2: The Classroom Environment' },
      { id: 'd3', label: 'Domain 3: Instruction' },
      { id: 'd4', label: 'Domain 4: Professional Responsibilities' }
    ],
    components: [
      { id: '1a', domainId: 'd1', label: 'Demonstrating Knowledge of Content and Pedagogy' },
      { id: '1b', domainId: 'd1', label: 'Demonstrating Knowledge of Students' },
      { id: '1c', domainId: 'd1', label: 'Setting Instructional Outcomes' },
      { id: '1d', domainId: 'd1', label: 'Demonstrating Knowledge of Resources' },
      { id: '1e', domainId: 'd1', label: 'Designing Coherent Instruction' },
      { id: '1f', domainId: 'd1', label: 'Designing Student Assessments' },
      { id: '2a', domainId: 'd2', label: 'Creating an Environment of Respect and Rapport' },
      { id: '2b', domainId: 'd2', label: 'Establishing a Culture for Learning' },
      { id: '2c', domainId: 'd2', label: 'Managing Classroom Procedures' },
      { id: '2d', domainId: 'd2', label: 'Managing Student Behavior' },
      { id: '2e', domainId: 'd2', label: 'Organizing Physical Space' },
      { id: '3a', domainId: 'd3', label: 'Communicating with Students' },
      { id: '3b', domainId: 'd3', label: 'Using Questioning and Discussion Techniques' },
      { id: '3c', domainId: 'd3', label: 'Engaging Students in Learning' },
      { id: '3d', domainId: 'd3', label: 'Using Assessment in Instruction' },
      { id: '3e', domainId: 'd3', label: 'Demonstrating Flexibility and Responsiveness' },
      { id: '4a', domainId: 'd4', label: 'Reflection on Teaching' },
      { id: '4b', domainId: 'd4', label: 'Maintaining Accurate Records' },
      { id: '4c', domainId: 'd4', label: 'Communicating with Families' },
      { id: '4d', domainId: 'd4', label: 'Participating in a Professional Community' },
      { id: '4e', domainId: 'd4', label: 'Growing and Developing Professionally' },
      { id: '4f', domainId: 'd4', label: 'Showing Professionalism' }
    ]
  };

  // A deliberately different shape, used to prove nothing assumes four domains.
  var THREE_DOMAIN_FRAMEWORK = {
    id: 'district-local-example',
    label: 'Local three-domain example',
    domains: [
      { id: 'env', label: 'Learning Environment' },
      { id: 'inst', label: 'Instruction' },
      { id: 'prof', label: 'Professional Practice' }
    ],
    components: [
      { id: 'env-1', domainId: 'env', label: 'Routines and transitions' },
      { id: 'inst-1', domainId: 'inst', label: 'Questioning and discussion' },
      { id: 'inst-2', domainId: 'inst', label: 'Checking for understanding' },
      { id: 'prof-1', domainId: 'prof', label: 'Collaboration with colleagues' }
    ]
  };

  // Synthetic observation notes. Written in the clipped shorthand a principal
  // actually produces, including one contradiction and one thin claim so the
  // validators have something real to catch.
  var SAMPLE_NOTES = [
    '9:05 entered. Do Now on board, timer running. 22 present.',
    '9:07 T asks "what evidence in paragraph 2 supports that?" waits ~5 sec before calling on anyone.',
    '9:09 three hands up, T takes two responses, asks second student to build on the first.',
    '9:12 one student at back has head down, no materials out.',
    '9:14 T circulates, stops at four desks, quiet check-ins.',
    '9:18 transition to partner work, took about 90 seconds, some milling.',
    '9:21 exit ticket posted on board for later.',
    'anchor chart from last week still up and referenced.'
  ].join('\n');

  function spanFor(notes, snippet) {
    var start = notes.indexOf(snippet);
    if (start === -1) throw new Error('Fixture snippet not found in notes: ' + snippet);
    return { start: start, end: start + snippet.length, text: snippet };
  }

  // Suggestions a well-behaved adapter would return for SAMPLE_NOTES.
  function goodSuggestions(notes) {
    return [
      {
        id: 's-3b',
        componentId: '3b',
        domainId: 'd3',
        objectiveEvidence: 'The teacher asked "what evidence in paragraph 2 supports that?" and waited about five seconds before calling on a student, then asked a second student to build on the first response.',
        interpretation: 'Wait time and the build-on move gave more than one student a route into the discussion.',
        confidence: 0.8,
        sourceSpans: [
          spanFor(notes, '9:07 T asks "what evidence in paragraph 2 supports that?" waits ~5 sec before calling on anyone.'),
          spanFor(notes, '9:09 three hands up, T takes two responses, asks second student to build on the first.')
        ]
      },
      {
        id: 's-2c',
        componentId: '2c',
        domainId: 'd2',
        objectiveEvidence: 'A Do Now was posted with a timer running at the start of the period, and the transition to partner work took about ninety seconds with some milling.',
        interpretation: 'Opening routine is established; the mid-period transition is the slower one.',
        confidence: 0.7,
        sourceSpans: [
          spanFor(notes, '9:05 entered. Do Now on board, timer running. 22 present.'),
          spanFor(notes, '9:18 transition to partner work, took about 90 seconds, some milling.')
        ]
      },
      {
        id: 's-3d',
        componentId: '3d',
        domainId: 'd3',
        objectiveEvidence: 'The teacher circulated and stopped at four desks for quiet check-ins, and an exit ticket was posted for later.',
        interpretation: 'Checking for understanding happened in conversation; the exit ticket was not yet collected during this visit.',
        confidence: 0.6,
        sourceSpans: [
          spanFor(notes, '9:14 T circulates, stops at four desks, quiet check-ins.'),
          spanFor(notes, '9:21 exit ticket posted on board for later.')
        ]
      },
      {
        id: 's-insufficient',
        result: 'insufficient_evidence',
        note: 'The notes do not establish anything about planning, family communication, or professional collaboration. A walkthrough of this length would not normally show them.'
      }
    ];
  }

  // Each of these should be caught. They exist so tests can prove the
  // validators fail on real defects rather than passing vacuously.
  function badSuggestions(notes) {
    return {
      fabricatedQuote: {
        id: 'bad-fabricated',
        componentId: '3a',
        objectiveEvidence: 'The teacher told the class "we will revisit this tomorrow".',
        interpretation: 'Closure was signalled.',
        sourceSpans: [{ start: 0, end: 20, text: 'The teacher told the class "we will revisit this tomorrow".' }]
      },
      uncitedClaim: {
        id: 'bad-uncited',
        componentId: '2a',
        objectiveEvidence: 'Rapport between teacher and students was warm throughout.',
        interpretation: 'Positive climate.',
        sourceSpans: []
      },
      unknownComponent: {
        id: 'bad-unknown',
        componentId: '9z',
        objectiveEvidence: 'Something happened.',
        sourceSpans: [spanFor(notes, '9:05 entered. Do Now on board, timer running. 22 present.')]
      },
      carriesRating: {
        id: 'bad-rating',
        componentId: '3c',
        rating: 'proficient',
        objectiveEvidence: 'The teacher circulated and stopped at four desks for quiet check-ins.',
        sourceSpans: [spanFor(notes, '9:14 T circulates, stops at four desks, quiet check-ins.')]
      },
      judgmentAsEvidence: {
        id: 'warn-judgment',
        componentId: '3c',
        objectiveEvidence: 'Students were engaged and the lesson was effective.',
        interpretation: 'Good pacing.',
        sourceSpans: [spanFor(notes, '9:09 three hands up, T takes two responses, asks second student to build on the first.')]
      },
      overGeneralized: {
        id: 'warn-generalized',
        componentId: '3c',
        objectiveEvidence: 'Three hands went up and the teacher took two responses.',
        interpretation: 'The students were all participating.',
        sourceSpans: [spanFor(notes, '9:09 three hands up, T takes two responses, asks second student to build on the first.')]
      },
      mismatchedDomain: {
        id: 'bad-domain',
        componentId: '3b',
        domainId: 'd1',
        objectiveEvidence: 'The teacher asked a text-evidence question.',
        sourceSpans: [spanFor(notes, '9:07 T asks "what evidence in paragraph 2 supports that?" waits ~5 sec before calling on anyone.')]
      }
    };
  }

  var SAMPLE_CONTEXT = {
    teacherDisplayName: 'Educator A (synthetic)',
    date: '2026-09-15',
    period: 'Period 2',
    subject: 'Grade 7 ELA',
    observer: 'Observer B (synthetic)'
  };

  var SAMPLE_FIELD_MAP = {
    d1: 'Domain 1 - Planning',
    d2: 'Domain 2 - Classroom Environment',
    d3: 'Domain 3 - Instruction',
    d4: 'Domain 4 - Professional Responsibilities',
    teacherDisplayName: 'Employee',
    date: 'Date',
    period: 'Period',
    observer: 'Principal'
  };

  var api = {
    PORTLAND_FRAMEWORK: PORTLAND_FRAMEWORK,
    THREE_DOMAIN_FRAMEWORK: THREE_DOMAIN_FRAMEWORK,
    SAMPLE_NOTES: SAMPLE_NOTES,
    SAMPLE_CONTEXT: SAMPLE_CONTEXT,
    SAMPLE_FIELD_MAP: SAMPLE_FIELD_MAP,
    spanFor: spanFor,
    goodSuggestions: goodSuggestions,
    badSuggestions: badSuggestions
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.WalkthroughCopilotFixtures = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
