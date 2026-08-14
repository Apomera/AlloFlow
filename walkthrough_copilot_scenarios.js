/*
 * AlloFlow Walkthrough Copilot - practice scenarios.
 *
 * A built-in professional-learning mode. Each scenario is a synthetic
 * observation that teaches one habit of evidence-based feedback, and each one
 * targets a specific way a walkthrough write-up goes wrong. The traps here are
 * the same failures the core validators catch, so practising the habit and
 * using the tool reinforce each other.
 *
 * Every scenario ships its own candidate suggestions. Practice mode therefore
 * runs with NO AI provider, NO network call, and NO district approval, which is
 * also what makes it safe to demonstrate to anyone at any time.
 *
 * WHAT THIS IS NOT. The reference reading attached to each scenario is one
 * defensible reading by one author. It is not an answer key, not a validated
 * observation-calibration instrument, and not evidence of inter-rater
 * reliability. Two careful observers can read the same lesson differently and
 * both be defensible. Practice results are self-reported and unverified in the
 * sense used by docs/PD_MICROCREDENTIAL_FOUNDATION.md, and must never be
 * presented as certification, calibration, or a measure of anyone's skill.
 *
 * All content is invented. No real educator, student, school, or lesson.
 */
(function () {
  'use strict';

  function spanFor(notes, snippet) {
    var start = notes.indexOf(snippet);
    if (start === -1) throw new Error('Scenario snippet not found in notes: ' + snippet);
    return { start: start, end: start + snippet.length, text: snippet };
  }

  function build(config) {
    var notes = config.notes;
    return {
      id: config.id,
      title: config.title,
      minutes: config.minutes,
      setting: config.setting,
      teaches: config.teaches,
      trap: config.trap,
      notes: notes,
      candidates: config.candidates(notes),
      reference: config.reference,
      discussion: config.discussion
    };
  }

  /* ------------------------------------------------------------------ *
   * 1. Thin notes. A short drop-in records very little. The pull is to
   *    write a full four-domain report anyway.
   * ------------------------------------------------------------------ */
  var THIN_NOTES = [
    '10:42 in. Small group at back table, rest independent reading.',
    '10:44 T with small group, hears one student read aloud, prompts on a word.',
    '10:47 out.'
  ].join('\n');

  var THIN = build({
    id: 'thin-notes',
    title: 'A five-minute drop-in',
    minutes: 5,
    setting: 'Grade 4 literacy block',
    teaches: 'Saying what the notes do not establish, instead of filling the gap.',
    trap: 'A short visit produces thin notes. The habit of completing every domain turns thin notes into confident claims nobody observed.',
    notes: THIN_NOTES,
    candidates: function (notes) {
      return [
        {
          id: 'thin-c1',
          componentId: '3d',
          objectiveEvidence: 'The teacher worked with a small group at the back table, listened to one student read aloud, and prompted on a word.',
          interpretation: 'A brief listen-in with in-the-moment prompting.',
          confidence: 0.7,
          sourceSpans: [spanFor(notes, '10:44 T with small group, hears one student read aloud, prompts on a word.')]
        },
        {
          id: 'thin-c2',
          componentId: '1e',
          objectiveEvidence: 'The lesson was well designed with a small group rotation and independent reading.',
          interpretation: 'Coherent planning.',
          confidence: 0.5,
          sourceSpans: [spanFor(notes, '10:42 in. Small group at back table, rest independent reading.')]
        },
        {
          id: 'thin-c3',
          result: 'insufficient_evidence',
          note: 'Five minutes in one corner of the room does not establish planning, classroom environment, or professional responsibilities.'
        }
      ];
    },
    reference: {
      support: ['3d'],
      overreach: ['1e'],
      expectInsufficient: true,
      note: 'Seeing a rotation running does not show how it was designed, why those groups, or what assessment informed them. That is a conference question, not a walkthrough observation.'
    },
    discussion: [
      'What would you have to see, or ask, to say anything about planning?',
      'Is a five-minute visit worth writing up at all? What makes it useful to the teacher?',
      'How do you word "I was only here briefly" without it sounding like an apology?'
    ]
  });

  /* ------------------------------------------------------------------ *
   * 2. One student becomes the whole class.
   * ------------------------------------------------------------------ */
  var GENERALIZE_NOTES = [
    '1:15 T poses problem on board, asks for strategies.',
    '1:17 one student explains a strategy at the board, uses the term "regrouping" correctly.',
    '1:19 T asks "did anyone solve it a different way?" pause, no hands.',
    '1:21 T moves on to guided practice.',
    '1:24 two students near window talking, not on task.'
  ].join('\n');

  var GENERALIZE = build({
    id: 'one-student-generalization',
    title: 'One voice, twenty-four students',
    minutes: 10,
    setting: 'Grade 6 mathematics',
    teaches: 'Keeping a claim the size of the evidence behind it.',
    trap: 'One articulate student is the most memorable thing in the notes, and the write-up quietly promotes them into "students".',
    notes: GENERALIZE_NOTES,
    candidates: function (notes) {
      return [
        {
          id: 'gen-c1',
          componentId: '3c',
          objectiveEvidence: 'Students were engaged and using precise mathematical vocabulary.',
          interpretation: 'Strong participation across the class.',
          confidence: 0.6,
          sourceSpans: [spanFor(notes, '1:17 one student explains a strategy at the board, uses the term "regrouping" correctly.')]
        },
        {
          id: 'gen-c2',
          componentId: '3b',
          objectiveEvidence: 'The teacher asked "did anyone solve it a different way?" and paused, and no hands went up before the class moved to guided practice.',
          interpretation: 'The invitation for alternative strategies did not draw a response on this occasion.',
          confidence: 0.8,
          sourceSpans: [
            spanFor(notes, '1:19 T asks "did anyone solve it a different way?" pause, no hands.'),
            spanFor(notes, '1:21 T moves on to guided practice.')
          ]
        }
      ];
    },
    reference: {
      support: ['3b'],
      overreach: ['3c'],
      expectInsufficient: false,
      note: 'One student at the board and two students off task are both in the notes. Neither is the class. The honest observation is about what the teacher asked and what came back.'
    },
    discussion: [
      'What would "students were engaged" require you to have recorded?',
      'The unanswered question is the most useful thing here. How do you raise it as a coaching point rather than a criticism?',
      'Do the two off-task students belong in the write-up at all?'
    ]
  });

  /* ------------------------------------------------------------------ *
   * 3. The observer's own judgments are already in the notes.
   * ------------------------------------------------------------------ */
  var JUDGMENT_NOTES = [
    '9:30 great rapport, kids clearly love this teacher.',
    '9:32 T greets three students by name at the door.',
    '9:35 strong classroom management.',
    '9:36 T uses a hand signal, noise level drops, takes about four seconds.',
    '9:40 lesson felt a bit flat.'
  ].join('\n');

  var JUDGMENT = build({
    id: 'judgment-in-notes',
    title: 'Notes that already decided',
    minutes: 10,
    setting: 'Grade 8 science',
    teaches: 'Separating what was seen from what it meant, even when your own notes blurred them.',
    trap: 'Shorthand written in the moment carries conclusions. Copied forward, a conclusion becomes an "observation" the teacher cannot dispute because nothing concrete was recorded.',
    notes: JUDGMENT_NOTES,
    candidates: function (notes) {
      return [
        {
          id: 'judg-c1',
          componentId: '2a',
          objectiveEvidence: 'There was great rapport and the students clearly love this teacher.',
          interpretation: 'Positive climate.',
          confidence: 0.5,
          sourceSpans: [spanFor(notes, '9:30 great rapport, kids clearly love this teacher.')]
        },
        {
          id: 'judg-c2',
          componentId: '2a',
          objectiveEvidence: 'The teacher greeted three students by name at the door.',
          interpretation: 'Greeting by name is one observable way rapport gets built.',
          confidence: 0.75,
          sourceSpans: [spanFor(notes, '9:32 T greets three students by name at the door.')]
        },
        {
          id: 'judg-c3',
          componentId: '2c',
          objectiveEvidence: 'The teacher used a hand signal and the noise level dropped in about four seconds.',
          interpretation: 'A practised, non-verbal transition signal.',
          confidence: 0.85,
          sourceSpans: [spanFor(notes, '9:36 T uses a hand signal, noise level drops, takes about four seconds.')]
        }
      ];
    },
    reference: {
      support: ['2c'],
      overreach: [],
      expectInsufficient: false,
      note: 'Both rapport candidates point at the same component. One quotes a conclusion, the other quotes an action. "Lesson felt a bit flat" is the hardest line in the notes: it is a real impression with nothing recorded behind it, and it should either be grounded or left out.',
      preferBetweenPair: { componentId: '2a', prefer: 'judg-c2', over: 'judg-c1' }
    },
    discussion: [
      'Your notes said "strong classroom management" and also recorded a four-second hand signal. Which one can the teacher act on?',
      'What do you do with "felt a bit flat" when you cannot say why?',
      'Is there a way to take notes that keeps the impression without disguising it as evidence?'
    ]
  });

  /* ------------------------------------------------------------------ *
   * 4. Two observations pull in opposite directions.
   * ------------------------------------------------------------------ */
  var CONTRADICTION_NOTES = [
    '11:05 directions given clearly, posted on board and read aloud.',
    '11:08 partner task begins.',
    '11:09 at least six students ask a neighbour what they are supposed to do.',
    '11:11 T restates the task, work starts.'
  ].join('\n');

  var CONTRADICTION = build({
    id: 'contradiction',
    title: 'Clear directions, confused room',
    minutes: 8,
    setting: 'Grade 5 social studies',
    teaches: 'Holding a contradiction open instead of resolving it silently.',
    trap: 'The write-up picks whichever half fits the story it is already telling, and the more interesting observation disappears.',
    notes: CONTRADICTION_NOTES,
    candidates: function (notes) {
      return [
        {
          id: 'con-c1',
          componentId: '3a',
          objectiveEvidence: 'Directions were given clearly, posted on the board and read aloud.',
          interpretation: 'Communication of the task was clear.',
          confidence: 0.6,
          sourceSpans: [spanFor(notes, '11:05 directions given clearly, posted on board and read aloud.')]
        },
        {
          id: 'con-c2',
          componentId: '3a',
          objectiveEvidence: 'Directions were posted and read aloud, and at the start of the partner task at least six students asked a neighbour what they were supposed to do. The teacher restated the task and work began.',
          interpretation: 'The directions were delivered in two modes and a substantial number of students still needed them restated. What made the restatement land is worth exploring.',
          confidence: 0.8,
          sourceSpans: [
            spanFor(notes, '11:05 directions given clearly, posted on board and read aloud.'),
            spanFor(notes, '11:09 at least six students ask a neighbour what they are supposed to do.'),
            spanFor(notes, '11:11 T restates the task, work starts.')
          ]
        }
      ];
    },
    reference: {
      support: ['3a'],
      overreach: [],
      expectInsufficient: false,
      note: 'The contradiction is the finding. A write-up that keeps only the first note is not wrong about that note, it is just useless to the teacher.',
      preferBetweenPair: { componentId: '3a', prefer: 'con-c2', over: 'con-c1' }
    },
    discussion: [
      'Which version would you rather receive about your own classroom?',
      '"Directions given clearly" was your own judgment written at 11:05. Did 11:09 change it?',
      'How do you write a contradiction so it reads as curiosity rather than a gotcha?'
    ]
  });

  /* ------------------------------------------------------------------ *
   * 5. Reaching into a domain the visit cannot see.
   * ------------------------------------------------------------------ */
  var OUT_OF_SCOPE_NOTES = [
    '2:10 lab stations set up before students arrive, materials counted out per station.',
    '2:13 T circulates with a clipboard, marks something after each station visit.',
    '2:20 two students ask to redo a measurement, T agrees and adjusts the timer.',
    '2:25 out.'
  ].join('\n');

  var OUT_OF_SCOPE = build({
    id: 'out-of-scope',
    title: 'What the clipboard does not tell you',
    minutes: 15,
    setting: 'High school chemistry',
    teaches: 'Noticing when a visible artifact tempts an invisible conclusion.',
    trap: 'Stations were ready and a clipboard was in use, so the write-up credits planning and record-keeping it never actually saw.',
    notes: OUT_OF_SCOPE_NOTES,
    candidates: function (notes) {
      return [
        {
          id: 'oos-c1',
          componentId: '3e',
          objectiveEvidence: 'Two students asked to redo a measurement, the teacher agreed and adjusted the timer.',
          interpretation: 'The teacher adjusted the plan in the moment to let students repeat their work.',
          confidence: 0.8,
          sourceSpans: [spanFor(notes, '2:20 two students ask to redo a measurement, T agrees and adjusts the timer.')]
        },
        {
          id: 'oos-c2',
          componentId: '4b',
          objectiveEvidence: 'The teacher maintained accurate records, marking after each station visit.',
          interpretation: 'Record keeping is thorough.',
          confidence: 0.55,
          sourceSpans: [spanFor(notes, '2:13 T circulates with a clipboard, marks something after each station visit.')]
        },
        {
          id: 'oos-c3',
          componentId: '1d',
          objectiveEvidence: 'Lab stations were set up before students arrived with materials counted out per station.',
          interpretation: 'Resources were prepared in advance.',
          confidence: 0.6,
          sourceSpans: [spanFor(notes, '2:10 lab stations set up before students arrive, materials counted out per station.')]
        }
      ];
    },
    reference: {
      support: ['3e'],
      overreach: ['4b'],
      expectInsufficient: false,
      note: 'A clipboard being written on is not evidence that the records are accurate. You saw marking, not what was marked. Prepared stations sit closer to the line: you did observe the room, so the honest version describes the setup you saw rather than crediting a planning process you did not.'
    },
    discussion: [
      'Where exactly is the line between "materials were counted out" and "the teacher plans well"?',
      'What would make the clipboard genuinely observable evidence?',
      'Which of these would you raise in a conference instead of writing up?'
    ]
  });

  var SCENARIOS = [THIN, GENERALIZE, JUDGMENT, CONTRADICTION, OUT_OF_SCOPE];

  var DISCLAIMER =
    'The reference reading is one defensible reading by one author. It is not an answer key, '
    + 'not a calibration instrument, and not evidence of inter-rater reliability. Two careful '
    + 'observers can read the same lesson differently and both be defensible. Use it to start '
    + 'a conversation, not to settle one.';

  function listScenarios() {
    return SCENARIOS.map(function (scenario) {
      return {
        id: scenario.id,
        title: scenario.title,
        minutes: scenario.minutes,
        setting: scenario.setting,
        teaches: scenario.teaches
      };
    });
  }

  function getScenario(id) {
    var found = null;
    SCENARIOS.forEach(function (scenario) {
      if (scenario.id === id) found = scenario;
    });
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  var api = {
    DISCLAIMER: DISCLAIMER,
    listScenarios: listScenarios,
    getScenario: getScenario,
    scenarioIds: SCENARIOS.map(function (scenario) { return scenario.id; })
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.WalkthroughCopilotScenarios = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
