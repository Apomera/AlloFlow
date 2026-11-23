'use strict';

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE =
  'Independent applied case-analysis practice; not an official ETS prompt, rubric, score, pass prediction, or licensure/employment determination. AlloFlow does not score written responses.';

const early_childhood_5025 = {
  workshopLabel: 'Applied classroom case workshops',
  workshopPracticeNote:
    'Independent applied early-childhood classroom case workshops designed to build developmentally appropriate literacy, mathematics, science, social studies, and whole-child instructional reasoning for Early Childhood (5025) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'ec5025-workshop-01',
      taskType: 'Emergent literacy case workshop (unscored)',
      title: 'Phoneme segmentation, short-vowel confusion, and emergent writing in Kindergarten',
      prompt:
        'As a Kindergarten teacher reviewing mid-year screening and writing-center samples, design a developmentally appropriate small-group literacy plan that bridges onset-rime awareness to full phoneme segmentation and phonetic spelling.',
      stimulus:
        'Mid-year Kindergarten screening shows 5 of 20 students clap 2- and 3-syllable words and recognize rhymes ("cat/hat") but stall on phoneme segmentation: given "sun" they say "/s/-un" instead of "/s/ /u/ /n/." In writing journals, the same students draw detailed scenes and write initial-consonant strings ("D G R N" for "The dog ran") with no word spacing, while 2 multilingual learners confuse short /e/ and short /i/.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Diagnose where these 5 students sit on the phonological-awareness continuum and emergent-writing progression, explaining what their strengths already show.',
        'B. Design a 15-minute multisensory small-group routine targeting full CVC phoneme segmentation, short /e/ versus short /i/ discrimination, and concepts of word spacing.',
        'C. Describe how you will monitor transfer into independent writing-center play without discouraging invented spelling or penalizing multilingual speech transfer.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Note mastery of syllables, rhyming, and onset-rime ("/s/-un") alongside semiphonetic consonant strings ("D G R N"), missing spaces, and /e/ versus /i/ confusion.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Follow the phonological-awareness progression from larger sound units to individual phonemes while using NAEYC developmentally appropriate, play-integrated oral and print routines.'
        },
        {
          label: 'Support plan',
          guidance:
            'Pair Elkonin sound boxes and counters with mirror-assisted mouth-shape cues for short /e/ and /i/, then transition into shared interactive writing with finger-space reminders.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Collect brief oral CVC blending/segmenting checks and dated journal samples over 3 weeks to verify medial-vowel encoding and spacing growth before moving to digraphs.'
        }
      ],
      successCriteria: [
        'Accurately identifies that students have mastered syllable and onset-rime awareness and now need explicit phoneme-level blending and segmenting.',
        'Recognizes "D G R N" as developmentally meaningful semiphonetic writing rather than random letter strings or careless mistakes.',
        'Includes concrete articulatory and visual supports (such as Elkonin boxes, picture-sound sorts, and mouth-position cues) for distinguishing short /e/ and short /i/.',
        'Uses shared writing and observational checkpoints to build word spacing and medial-vowel spelling while preserving authentic student authorship.'
      ],
      commonPitfalls: [
        'Retraining rhyming and syllable clapping exclusively even though screening already shows those earlier skills are secure.',
        'Treating invented spelling ("D G R N") as failure by forcing students to copy teacher-written sentences instead of stretching sounds.',
        'Correcting multilingual learners with rote isolated drill sheets instead of oral articulatory modeling and meaningful picture-word context.',
        'Skipping oral phonemic awareness and jumping directly to silent sight-word flashcards before students can hear medial vowel sounds.'
      ],
      sampleOutline: [
        'Diagnostic profile: students demonstrate solid syllable, rhyme, onset-rime, and initial-sound knowledge; priority targets are 3-phoneme segmentation, medial vowels /e/ and /i/, and word boundaries.',
        'Developmental framework: align explicit, brief, playful phonemic awareness with NAEYC principles that honor emergent writing and linguistic diversity.',
        'Targeted routine: use 3-box Elkonin mats with chips for continuous-sound CVC words ("sun", "men", "pin"), mirror mouth checks for /e/ vs. /i/, and interactive shared sentences modeling finger spaces.',
        'Progress check: track 5-word oral segmentation probes and weekly journal artifacts to confirm movement from consonant skeletons toward phonetic CVC spelling.'
      ],
      references: [
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5025.pdf',
        'https://www.naeyc.org/resources/position-statements/dap/principles'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'ec5025-workshop-02',
      taskType: 'Reading comprehension case workshop (unscored)',
      title: 'Interactive read-aloud, story structure, and causal inferencing in 1st grade',
      prompt:
        'As a 1st-grade teacher refining your children’s literature block, redesign an interactive read-aloud and retelling sequence so students move from isolated recall to coherent story-structure retelling and causal inferencing.',
      stimulus:
        'During a 1st-grade read-aloud of a folktale with 22 students, 16 children accurately name the main character and setting, yet only 7 explain why the character changed plans midway through the plot. In partner retells, 8 students list unrelated events out of order without identifying the problem or resolution, and 4 students lose focus during uninterrupted 12-minute reading stretches lacking visual or talk prompts.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Interpret what the read-aloud data reveal about literal recall versus inferential comprehension, story-grammar awareness, and engagement barriers.',
        'B. Plan a structured interactive read-aloud cycle using strategic stopping points, child-friendly vocabulary support, and multimodal retelling scaffolds.',
        'C. Explain how you will pair a companion informational picture book and formative retelling rubric to verify comprehension growth across the class.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Contrast strong literal recall (16 of 22 naming character/setting) with low causal inference (7 of 22), fragmented retells (8 students), and attention drop-off during 12-minute stretches.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Apply dialogic reading, explicit story-grammar modeling (beginning/problem, middle/attempts, ending/resolution), and active turn-and-talk breaks suited to 6-to-7-year-olds.'
        },
        {
          label: 'Support plan',
          guidance:
            'Insert 3 planned think-aloud stops modeling "because" cause-and-effect clues, pre-teach 3 Tier-2 words with gestures, and provide picture-sequence cards or puppets for structured partner retells.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Use a 4-item oral retell checklist during center time and pair a nonfiction book on the folktale’s animal or setting so students compare narrative and informational text features.'
        }
      ],
      successCriteria: [
        'Distinguishes literal recall strengths from the specific instructional gaps in causal inference, chronological story structure, and sustained active participation.',
        'Builds short, purposeful interactive stopping points with open-ended "why" prompts and think-pair-share routines rather than 12 minutes of passive listening.',
        'Incorporates tangible retelling supports (story-map icons, picture-sequence cards, or dramatic enactment) accessible to all learners.',
        'Connects oral comprehension to genre comparison and simple formative checks without relying on independent silent worksheets beyond 1st-grade decoding levels.'
      ],
      commonPitfalls: [
        'Re-reading the entire story faster without stopping to model how text and illustration clues explain character motivation.',
        'Assigning a silent written comprehension quiz that confounds 1st-grade decoding or handwriting limits with listening comprehension.',
        'Treating the 4 disengaged listeners as a behavior problem instead of shortening reading chunks and adding visual and partner-talk engagement.',
        'Focusing exclusively on naming characters and settings again while leaving problem-solution structure and cause-and-effect unaddressed.'
      ],
      sampleOutline: [
        'Comprehension gap analysis: most students retrieve literal facts, but causal reasoning, sequenced story grammar, and pacing for active attention need explicit scaffolding.',
        'Dialogic read-aloud design: break the text into 3-to-4-minute segments with visual cue cards, brief gesture-based vocabulary checks, and modeled "I notice this clue, so I think" think-alouds.',
        'Multimodal retelling practice: guide partners to order 4 picture cards (character/setting, problem, turning point, resolution) and act out why the character’s plan shifted.',
        'Extension and check: introduce a short informational picture book on a linked topic to compare story elements against facts, scoring oral retells with a simple 4-part checklist.'
      ],
      references: [
        'https://www.naeyc.org/resources/position-statements/dap/principles',
        'https://praxis.ets.org/test/early-childhood-education-5025.html'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'ec5025-workshop-03',
      taskType: 'Early mathematics case workshop (unscored)',
      title: 'Place-value bundling and linear measurement misconceptions in 1st grade',
      prompt:
        'As a 1st-grade teacher analyzing math-station observations, plan a Concrete-Representational-Abstract (CRA) instructional response addressing base-ten place value and accurate length measurement.',
      stimulus:
        'In a spring 1st-grade math check, 6 of 20 students read "34" aloud accurately yet build it with 3 unit cubes and 4 unit cubes (7 total) instead of 3 tens rods and 4 ones; 5 students also pick 29 as larger than 31 because 9 is bigger than 3 and 1. At a measurement center, 6 students leave gaps between cubes when measuring a 6-cube pencil, and 3 align a 5-inch crayon at the 1-inch ruler mark, reporting 6 inches.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Diagnose the conceptual misconceptions driving the base-ten errors (34 as 7 cubes; 29 versus 31) and the length-measurement errors (cube gaps; starting at 1 inch).',
        'B. Sequence hands-on CRA activities that build unitizing groups of ten and zero-point, gap-free unit iteration.',
        'C. Specify oral math-talk questions and quick manipulative exit tasks that confirm genuine conceptual repair.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Connect building 34 as 3 + 4 = 7 and choosing 29 over 31 to weak unitizing of tens, and link cube gaps plus reading 6 inches for a 5-inch crayon to misunderstanding length as iterated equal intervals.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Use Concrete-Representational-Abstract (CRA) progressions with groupable models first, emphasizing that each ten represents 10 bundled ones and that length counts equal unit spaces from 0.'
        },
        {
          label: 'Support plan',
          guidance:
            'Have students physically bundle 10 straws or snap-cubes into tens to compare 29 (2 bundles, 9 loose) against 31 (3 bundles, 1 loose), and use broken-ruler/end-to-end tile challenges to make gaps and starting points visible.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Ask students to build and draw two-digit numbers (such as 42 versus 24) and measure a classroom object starting both at 0 and from a non-zero mark by counting unit spaces.'
        }
      ],
      successCriteria: [
        'Explains that treating 34 as 3 + 4 = 7 and 29 as greater than 31 stems from viewing digits as isolated ones rather than positional tens and ones.',
        'Identifies that starting at 1 inch overcounts by 1 (1 + 5 = 6) because students read the endpoint hash mark instead of counting 5 one-inch unit intervals.',
        'Prioritizes groupable manipulatives (bundling sticks, ten-frames, linking cubes) before transitioning to pre-grouped base-ten drawings and symbols.',
        'Includes concrete measurement comparison tasks that demonstrate why gaps, overlaps, and misaligned starting points distort length.'
      ],
      commonPitfalls: [
        'Drilling abstract "greater than/less than" alligator tricks without helping children physically compare 2 tens and 9 ones against 3 tens and 1 one.',
        'Jumping straight to pre-grouped base-ten rods or worksheets for students who have not yet bundled 10 single objects into 1 ten.',
        'Telling students "just always put it on zero" as a rule without illustrating how length represents the count of equal spaces between marks.',
        'Combining unrelated timed arithmetic drills into the re-teach instead of targeting place value and measurement iteration directly.'
      ],
      sampleOutline: [
        'Misconception diagnosis: students treat multi-digit numerals as single-digit counts (3 + 4 = 7; 9 beats 3 and 1) and treat measurement as reading a numeral rather than iterating equal gap-free units.',
        'Place-value CRA sequence: bundle 34 linking cubes into 3 towers of ten plus 4 singles, sketch tens-sticks and dots, then compare 29 and 31 on side-by-side tens-and-ones mats.',
        'Measurement sequence: test a "crooked vs. end-to-end" cube train on the 6-cube pencil, then align colored 1-inch tiles alongside a ruler so students see a 5-inch crayon spans 5 spaces whether placed from 0 to 5 or 1 to 6.',
        'Formative verification: listen for explanations using "tens/ones" and "equal spaces without gaps" during a 2-minute station check on 28 vs. 32 and a 4-inch marker.'
      ],
      references: [
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5025.pdf',
        'https://www.naeyc.org/resources/position-statements/dap/principles'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'ec5025-workshop-04',
      taskType: 'Geometry & data case workshop (unscored)',
      title: 'Defining geometric attributes and scaled picture graphs in 2nd grade',
      prompt:
        'As a 2nd-grade teacher reviewing unit checkpoints, design an inquiry-based math mini-unit that helps students classify shapes by defining attributes and interpret scaled picture graphs accurately.',
      stimulus:
        'In a 2nd-grade class of 24 students, 9 reject a square rotated 45 degrees as "a diamond, not a square" and call a skinny scalene triangle "not a triangle because it looks crooked." On a class picture graph of favorite recess games where each ball icon equals 2 students (Jump Rope: 4 icons, Tag: 3 icons, Four Square: 5 icons), 7 students say 5 children picked Four Square instead of 10 and miss the 4-student gap over Tag.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Explain the developmental reasoning behind orientation-bound shape prototypes and one-to-one icon counting on a scaled picture graph.',
        'B. Design hands-on geometry and data activities that highlight defining attributes (sides, angles, vertices) and multiplicative scale reading (counting by 2s).',
        'C. Outline formative check questions that verify students can justify shape classifications and solve comparison problems from scaled data.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Link rejecting rotated squares and skinny triangles to visual-prototype thinking, and connect reporting 5 instead of 10 for Four Square (and missing 10 minus 6 equals 4) to ignoring the 2-students-per-icon key.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Guide 2nd graders from holistic visual recognition toward attribute-based geometric reasoning while connecting scaled picture graphs directly to skip-counting by 2s and additive comparison.'
        },
        {
          label: 'Support plan',
          guidance:
            'Use geoboard non-examples, shape-rotation "turn tests" with index-card right-angle checkers, and partner builds where 2 interlocking cubes stack directly onto each ball icon (8, 6, and 10 students).'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Have students sort mixed-orientation shape cards with verbal "because" rules and write one "how many more" question using a fresh key-of-2 class survey graph.'
        }
      ],
      successCriteria: [
        'Clearly distinguishes defining attributes (closed figure, 4 equal sides and 4 square corners; 3 straight sides and 3 vertices) from non-defining attributes (orientation, color, size).',
        'Correctly calculates and explains the scaled graph totals (Jump Rope = 8, Tag = 6, Four Square = 10, total = 24) and the 4-student difference between Four Square and Tag.',
        'Uses concrete manipulatives (geoboards, pattern blocks, right-angle corner testers, 2-cube stacks) to make both geometric invariance and graph scaling visible.',
        'Builds student discourse around justifying classifications and checking the graph key before answering comparison questions.'
      ],
      commonPitfalls: [
        'Showing only upright equilateral triangles and horizontal squares on posters, reinforcing the exact orientation misconception being corrected.',
        'Labeling a rotated square a "diamond" in classroom talk instead of confirming that rotation does not change a square’s side lengths or right angles.',
        'Removing the key-of-2 scale completely instead of scaffolding skip-counting by 2s and pairing concrete cube pairs with each icon.',
        'Asking only "which bar is tallest?" questions without practicing quantitative "how many more" comparison problems tied to the scale.'
      ],
      sampleOutline: [
        'Error analysis: students rely on rigid visual prototypes rather than defining geometric properties, and count graph symbols 1-for-1 instead of applying the key (1 icon = 2 students).',
        'Geometry lab: rotate cutout squares on a document camera while checking 4 equal sides and 4 right-angle corners, and stretch varied scalene, obtuse, and inverted triangles on geoboards.',
        'Scaled-data studio: place 2 cubes on every icon (Jump Rope = 8, Tag = 6, Four Square = 10; 24 total) so students physically compare the 4-cube difference between Four Square and Tag.',
        'Verification: conduct a quick "Prove It" sort with tilted polygons and a 2-question exit card requiring students to circle the graph key before computing totals and differences.'
      ],
      references: [
        'https://praxis.ets.org/test/early-childhood-education-5025.html',
        'https://www.naeyc.org/resources/position-statements/dap/principles'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'ec5025-workshop-05',
      taskType: 'Early science inquiry case workshop (unscored)',
      title: 'Fair testing, observation logs, and evidence-based claims in 2nd-grade life science',
      prompt:
        'As a 2nd-grade teacher facilitating a life-science investigation on plant needs, guide students to revise a confounded seed-sprouting experiment into a developmentally appropriate fair test grounded in recorded evidence.',
      stimulus:
        'During a 2nd-grade plant-growth inquiry, teams test whether bean seeds sprout faster in sunlight or shade. One group puts 4 seeds in sandy soil on a sunny sill with daily watering, while placing 4 seeds in potting soil inside a dark cabinet watered once a week. After 10 days, students conclude "sunlight dries soil so shade is bad," having recorded no measurements and overlooking that light, soil, and watering all changed at once.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Identify the experimental-design flaw (confounded variables) and the gap between the team’s data and their spoken conclusion.',
        'B. Redesign the 2nd-grade investigation as a fair test aligned to NGSS practices (asking questions, planning investigations, and arguing from evidence) with kid-friendly measurement routines.',
        'C. Detail teacher questioning, safety/care routines, and visual science-notebook supports that help young learners connect cause, effect, and evidence.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Point out that changing sunlight, soil type (sandy vs. potting), and watering frequency (daily vs. weekly) simultaneously prevents knowing which factor caused growth differences, compounded by missing daily records.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Apply NGSS three-dimensional early inquiry: keep every condition identical except the one variable tested ("change one thing, keep the rest the same") and anchor claims in observable evidence.'
        },
        {
          label: 'Support plan',
          guidance:
            'Co-create a picture-supported Fair-Test T-chart ("What we change: light" vs. "What stays the same: potting soil, 4 seeds, 2 spoons of water every 2 days") and use labeled science journals with dated drawings and centimeter strips.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Hold brief Day 4, Day 7, and Day 10 gallery walks where teams state one claim supported by their logged measurements and discuss why sprouting can begin in the dark while healthy leafy growth needs light.'
        }
      ],
      successCriteria: [
        'Clearly identifies all three confounded variables (light exposure, soil type, and watering schedule) and explains why the original conclusion is unsupported.',
        'Establishes a developmentally accessible fair test that isolates light while holding seed count, container, soil type, and measured water volume constant.',
        'Integrates concrete observation tools (dated sketches, paper centimeter strips or unifix-cube height bars, simple tally/check logs) appropriate for 2nd graders.',
        'Scaffolds early Claim-Evidence reasoning ("My window plant grew taller, and my measurement log shows why") alongside safe handwashing after handling soil and seeds.'
      ],
      commonPitfalls: [
        'Discarding the students’ experiment and lecturing on photosynthesis instead of letting them discover why changing three things at once made the test unfair.',
        'Introducing advanced high-school terminology ("independent/dependent variables" memorized verbatim) without concrete "what we change / what stays the same" framing.',
        'Forgetting to standardize water volume and watering days, which leaves moisture confounded with sunlight.',
        'Allowing students to state opinions ("shade is bad") rather than citing recorded stem heights, leaf color, and germination counts.'
      ],
      sampleOutline: [
        'Inquiry diagnosis: three simultaneous changes (light, soil, water) plus zero logged observations make it impossible to attribute differences to sunlight alone.',
        'Fair-test redesign: guide the class to build a visual "Fair Test Checklist" keeping identical cups, potting soil, 4 bean seeds, and measured watering while varying only window light versus dark cabinet.',
        'Data & reasoning routine: schedule 5-minute bi-daily observations using magnifying lenses, dated sketches, cube/centimeter height strips, and handwashing safety habits.',
        'Evidence talk: conclude with a structured Claim-Evidence share comparing germination versus healthy green leaf growth so students see how evidence refines initial guesses.'
      ],
      references: [
        'https://www.nextgenscience.org/',
        'https://www.naeyc.org/resources/position-statements/dap/principles'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'ec5025-workshop-06',
      taskType: 'Integrated social studies, PE & arts workshop (unscored)',
      title: 'Inclusive community inquiry, cooperative movement, and process art in 1st grade',
      prompt:
        'As a 1st-grade teacher revising an interdisciplinary community unit, transform passive worksheets and an elimination gym game into active social studies inquiry, inclusive physical education, health habits, and process-oriented arts.',
      stimulus:
        'A 1st-grade unit on "Neighborhood Helpers and Healthy Communities" serves 22 students, including 1 child using a walker and 3 emerging bilingual learners. Draft lessons rely on pre-printed fire-truck coloring sheets, a brief textbook map paragraph, and a timed elimination relay race in the gym. Informal checks show students confuse map symbols with literal drawings, mix up needs and wants, and 2 children sit out early during elimination rounds.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Critique the draft unit against NCSS early social studies inquiry, SHAPE America inclusive physical-education principles, and process-focused arts standards.',
        'B. Redesign the unit with concrete mapping and needs-versus-wants activities, an adapted cooperative movement/health station, and an open-ended visual or dramatic arts project.',
        'C. Describe accessibility accommodations and authentic performance checks that ensure full participation for the walker user and emerging bilingual learners.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Address the map-symbol confusion, needs-versus-wants mix-up, passive coloring sheets, and exclusion caused by elimination games—especially for the child using a walker and emerging bilingual learners.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Integrate NCSS inquiry around familiar lived spaces, SHAPE America non-elimination maximum-participation PE with adaptive pathways, practical health/safety skills, and student-created process art.'
        },
        {
          label: 'Support plan',
          guidance:
            'Build a 3D classroom-to-neighborhood map with a visual symbol key, sort bilingual picture cards of needs versus wants, run cooperative "healthy helper" movement stations on wide flat lanes, and let students design original collage murals or role-play skits.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Observe whether every student stays actively moving throughout PE, explains at least two map symbols using visual/bilingual supports, and distinguishes a community need from a want during mural presentations.'
        }
      ],
      successCriteria: [
        'Replaces the elimination relay race with cooperative, non-elimination movement stations featuring wide, level pathways and modified roles so the child with a walker participates fully without sitting out.',
        'Moves map learning from abstract textbook paragraphs to concrete spatial mapping of familiar school/neighborhood landmarks paired with an explicit picture-supported symbol key.',
        'Clearly teaches economic needs versus wants and practical community health/safety behaviors (such as handwashing, crosswalk safety, or balanced snacks) through visual sorting and role-play.',
        'Replaces identical pre-printed coloring templates with open-ended, process-oriented creative arts (collage, mural design, movement rhythm, or dramatic helper skits) honoring linguistic diversity.'
      ],
      commonPitfalls: [
        'Keeping the elimination relay race and assigning the student with a walker to "keep score" on the sidelines instead of adapting movement tasks for full participation.',
        'Confusing teacher-directed craft templates (identical fire trucks) with authentic creative arts expression.',
        'Teaching abstract state or global maps before 1st graders understand bird’s-eye perspective and map keys for their own classroom and neighborhood.',
        'Relying solely on English-only written definitions for needs versus wants instead of real objects, bilingual labels, and community photographs.'
      ],
      sampleOutline: [
        'Unit audit: pre-printed coloring pages suppress creative choice, elimination relays reduce active movement and exclude mobility-device users, and textbook map paragraphs skip concrete spatial foundations.',
        'Social studies & health core: create a tabletop block model of the school block translated into a 2D map with a legend, sort real-photo cards into community needs vs. wants with bilingual captions, and practice crosswalk/handwashing safety.',
        'Inclusive PE & arts integration: run cooperative "Community Helper Circuit" stations (no elimination, wide level lanes, rolling/tossing/carrying options) plus open-ended mixed-media neighborhood murals and short helper role-plays.',
        'Authentic checks: use an observational checklist during stations and student-narrated map/mural tours (oral, gestural, or bilingual) to verify map-key use, needs/wants reasoning, and full physical engagement.'
      ],
      references: [
        'https://www.socialstudies.org/standards/national-curriculum-standards-social-studies',
        'https://www.shapeamerica.org/standards/pe/'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    }
  ]
};

const parapro = {
  workshopLabel: 'Applied instructional-support workshops',
  workshopPracticeNote:
    'Independent applied classroom-support workshops designed to build reading, mathematics, and writing support strategies within teacher-directed paraprofessional scope for ParaPro study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or employment determinations.',
  workshops: [
    {
      id: 'parapro-workshop-01',
      taskType: 'Reading comprehension support workshop (unscored)',
      title: 'Guiding main idea, context vocabulary, and text-based inference in 5th grade',
      prompt:
        'Working under a 5th-grade teacher’s reading plan, outline how you will coach a small group to distinguish the central idea from minor details, unlock vocabulary from context clues, and anchor inferences in textual evidence.',
      stimulus:
        'Under the 5th-grade teacher’s small-group plan, you support 4 students reading a 3-paragraph article explaining how urban tree canopies lower summer street temperatures by up to 9 degrees Fahrenheit and absorb stormwater. Three students pick "Trees have green leaves in summer" as the main idea, miss the context clue for "mitigate" ("shade trees help mitigate, or reduce, extreme heat"), and guess inference answers without citing any sentence.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Identify the specific reading-comprehension breakdown in main idea, context-clue vocabulary, and textual inference shown by the 4 students.',
        'B. Script brief, scaffolded paraprofessional prompts that guide students to locate the central idea, use the appositive clue for "mitigate," and verify inferences in the text without giving away answers.',
        'C. Explain how you will honor teacher-directed paraprofessional boundaries and report concrete observations back to the classroom teacher.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Note that 3 students selected a minor fact ("green leaves") instead of the passage’s overarching benefit of urban canopies, overlooked the explicit synonym clue ("or reduce"), and skipped text verification.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Use gradual-release questioning aligned to the teacher’s comprehension routine: synthesize repeated paragraph topics for main idea, inspect surrounding appositive clues, and require "point to the line" proof.'
        },
        {
          label: 'Support plan',
          guidance:
            'Have students underline what all 3 paragraphs discuss (cooling streets by 9 degrees and absorbing stormwater), circle the comma phrase "or reduce" next to "mitigate," and pair each inference with a highlighted sentence.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Ask each student to restate the main idea in one sentence using two text facts, then hand the supervising teacher a brief sticky-note tally of who still needed prompting on context clues or citations.'
        }
      ],
      successCriteria: [
        'Accurately distinguishes the passage’s main idea (urban tree canopies cool hot streets and manage stormwater) from the minor detail ("green leaves").',
        'Uses the explicit in-sentence appositive clue ("or reduce") to help students derive the meaning of "mitigate" rather than handing out a dictionary definition first.',
        'Models text-dependent questioning ("Which sentence backs up your inference?") so students do the cognitive work instead of passively copying adult answers.',
        'Maintains strict paraprofessional scope by implementing the teacher’s assigned text/plan and sharing objective observational notes rather than redesigning the curriculum or assigning grades.'
      ],
      commonPitfalls: [
        'Telling students the correct main idea and definition of "mitigate" directly to finish the worksheet faster.',
        'Swapping the teacher’s assigned article for a different easier passage on your own without teacher approval.',
        'Accepting plausible background-knowledge guesses on inference questions without checking whether the article supports them.',
        'Sending students straight to a glossary before teaching them to notice the "or reduce" context clue right inside the sentence.'
      ],
      sampleOutline: [
        'Comprehension snapshot: students confuse a single detail with the central idea, miss an explicit appositive clue ("or reduce"), and make unsupported guesses rather than text-backed inferences.',
        'Guided prompts: ask "What problem do all three paragraphs show trees solving?" to surface cooling and stormwater benefits; prompt students to reread the commas around "mitigate, or reduce" and test substituting "reduce."',
        'Evidence habit: require students to place a finger or highlighter strip on the sentence supporting each inference before sharing aloud with the group.',
        'Teacher handoff: stay within the teacher’s planned text and time block, recording brief student-by-student notes on main-idea vs. context-clue independence for the teacher’s next lesson.'
      ],
      references: [
        'https://www.ets.org/pdfs/parapro/1755.pdf',
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'parapro-workshop-02',
      taskType: 'Foundational reading support workshop (unscored)',
      title: 'Decoding multisyllabic words, building fluency, and using text features in 3rd grade',
      prompt:
        'Following a 3rd-grade teacher’s guided-reading reinforcement plan, describe how you will coach 3 students on word-part decoding, fluent phrasing, and informational text features while keeping student ownership intact.',
      stimulus:
        'Following a 3rd-grade teacher’s small-group plan, you coach 3 students reading a leveled science article on bee pollination featuring bold glossary words, section headings, and a flower diagram. Two students skip words like "unhelpful" and "pollinator" or guess from pictures, read word-by-word at 58 words correct per minute with flat phrasing, and ignore the diagram when asked how pollen moves. One student asks you to read the page aloud for them.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Diagnose the decoding, fluency, and text-feature habits limiting comprehension for these 3 students without overstepping into formal diagnostic labels.',
        'B. Plan a teacher-aligned support sequence covering morphological/syllable chunking ("un-help-ful", "pol-li-na-tor"), brief repeated-reading fluency practice, and active diagram/glossary use.',
        'C. Respond constructively to the student’s request that you read the whole page for them, and summarize the objective data you will report to the supervising teacher.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Identify picture-guessing on multisyllabic words ("unhelpful", "pollinator"), choppy 58-WCPM word-by-word pacing, skipped diagram/glossary cues, and task-avoidance in asking the adult to read.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Apply WWC foundational-reading guidance: prompt students to decode through word parts and syllables rather than picture-guessing, model expressive phrasing through echo/choral rereading, and teach text features as meaning tools.'
        },
        {
          label: 'Support plan',
          guidance:
            'Cover and reveal prefixes, bases, and suffixes ("un" + "help" + "ful"; "pol-li-na-tor"), run a short 2-sentence echo read for phrasing, and have students trace the diagram arrows while checking one bold glossary term.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Invite the hesitant student to alternate sentences ("I read one, you read one") so they stay engaged, then share observed decoding patterns and diagram use with the teacher without diagnosing a reading disability.'
        }
      ],
      successCriteria: [
        'Replaces picture-guessing with explicit word-part and syllable-chunking prompts ("un-help-ful", "pol-li-na-tor") grounded in print.',
        'Uses brief, supportive fluency routines (echo reading, choral reading, or phrase-scooped rereading of a short excerpt) rather than timed shaming or reading the whole passage for the student.',
        'Directs students to use the section headings, labeled flower diagram, and bold glossary words to answer how pollen travels between blossoms.',
        'Preserves paraprofessional scope by declining to diagnose dyslexia/disabilities and reporting observable reading behaviors directly to the classroom teacher.'
      ],
      commonPitfalls: [
        'Reading the entire page aloud for the student to avoid frustration, which removes essential decoding and fluency practice.',
        'Encouraging students to "just look at the picture and guess" when they encounter "unhelpful" or "pollinator."',
        'Telling the teacher or parent that the choppy 58-WCPM readers "probably have dyslexia" instead of reporting factual observations.',
        'Correcting every single miscue instantaneously without giving wait time to self-correct using syllable and word-part strategies.'
      ],
      sampleOutline: [
        'Observed needs: students rely on picture guesses on multisyllabic words, read with slow choppy phrasing, overlook diagram/glossary clues, and show reading fatigue.',
        'Decoding & fluency scaffold: guide students to peel off prefix/suffix chunks ("un-help-ful") and blend syllables ("pol-li-na-tor"), then model 2 sentences with natural phrasing followed by choral and partner rereading.',
        'Text-feature integration: pause at the section heading, trace the flower diagram’s labeled path with a finger, and look up one bold word in the glossary to connect visual and written facts.',
        'Boundaries & reporting: offer structured turn-taking ("we will tackle this sentence together") instead of taking over reading, and give the teacher a concise log of missed word parts and fluency response.'
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published',
        'https://www.ets.org/pdfs/parapro/1755.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'parapro-workshop-03',
      taskType: 'Mathematics support workshop (unscored)',
      title: 'Scaffolding fraction addition and percent-discount error analysis in 6th grade',
      prompt:
        'During a teacher-assigned 6th-grade rational-number practice block, guide 3 students to uncover and repair misconceptions in fraction addition and percent discounts while keeping computation and estimation in student hands.',
      stimulus:
        'During a 6th-grade math practice block assigned by the teacher, you monitor 3 students solving rational-number problems. On "2/3 + 1/4", two students write "3/7" by adding numerators and denominators straight across. On "A $40 backpack is 15% off; find the sale price", one student subtracts $15 directly to get $25 while another converts 15% to 1.5 and gets a $60 discount. A student asks for the final answers before the bell.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Verify the correct mathematical solutions and pinpoint the exact conceptual errors behind "3/7", "$25", and the "$60 discount."',
        'B. Sequence visual, benchmark-estimation, and step-by-step questioning supports that help students self-correct both problems without handing over finished answers.',
        'C. Describe how you will close the session responsibly before the bell and communicate student error patterns to the classroom teacher.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Confirm the true answers—2/3 + 1/4 = 8/12 + 3/12 = 11/12, and 15% of $40 is $6 giving a $34 sale price—and note the three errors: adding denominators, treating 15% as $15, and converting 15% to 1.5 instead of 0.15.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Use benchmark estimation and concrete/visual models (fraction strips and 10%-plus-5% percent bars) so students recognize impossible answers (3/7 is less than 1/2; a $60 discount exceeds $40) before recomputing.'
        },
        {
          label: 'Support plan',
          guidance:
            'Prompt students to estimate 2/3 + 1/4 against 1/2, split thirds and fourths into twelfths to sum 8/12 + 3/12 = 11/12, and decompose 15% of $40 into 10% ($4) plus 5% ($2) = $6 off, yielding $40 minus $6 = $34.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Decline to give answers just to beat the bell; have students try one fresh transfer item (such as 10% off $30) if time allows, and share the three misconception clusters with the teacher for next-day reteaching.'
        }
      ],
      successCriteria: [
        'Computes both problems accurately (2/3 + 1/4 = 8/12 + 3/12 = 11/12; 15% of $40 = 0.15 times $40 = $6 discount, sale price = $40 minus $6 = $34).',
        'Uses reasonableness checks ("2/3 is already more than 1/2, so can the sum be 3/7?" and "Can a 15% discount cost more than the entire $40 backpack?") to trigger self-correction.',
        'Scaffolds fraction equivalence with common twelfths and percent conversion (15% = 15/100 = 0.15, or 10% = $4 plus 5% = $2) using student-executed steps.',
        'Refuses to supply completed answers to beat the bell and logs specific rational-number errors for the supervising math teacher.'
      ],
      commonPitfalls: [
        'Giving the final answers ("11/12" and "$34") before the bell so students turn in a finished sheet with zero conceptual repair.',
        'Reciting "cross-multiply and butterfly" tricks without explaining why unlike fraction units (thirds and fourths) require equal-sized twelfths.',
        'Overlooking the decimal place-value error (15% = 0.15, not 1.5) or failing to distinguish a $6 discount from the $34 final sale price.',
        'Assigning extra homework or modifying the student’s grade independently instead of relaying error notes to the classroom teacher.'
      ],
      sampleOutline: [
        'Math verification & error map: 2/3 + 1/4 = 8/12 + 3/12 = 11/12 (not 3/7, which is under 1/2); 15% = 0.15, so 0.15 times $40 = $6 discount and $40 minus $6 = $34 sale price (not $25 or $60 off).',
        'Fraction scaffold: compare 2/3 and 3/7 on a fraction bar to spark cognitive conflict, partition both bars into twelfths, and let students add 8/12 + 3/12 themselves.',
        'Percent scaffold: ask whether 15% means 15 dollars or 15 per 100, model 10% of $40 ($4) plus half of that for 5% ($2) to find $6 off, and verify $40 minus $6 = $34.',
        'Scope & follow-up: prioritize understanding over rushing before the bell, note unfinished items neutrally, and brief the teacher on denominator-addition and percent-decimal confusion.'
      ],
      references: [
        'https://www.ets.org/pdfs/parapro/1755.pdf',
        'https://openstax.org/details/books/prealgebra-2e/'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'parapro-workshop-04',
      taskType: 'Applied math & geometry support workshop (unscored)',
      title: 'Supporting proportional reasoning, linear equations, and area versus perimeter in 7th grade',
      prompt:
        'Under a 7th-grade math teacher’s station directions, coach a small group through three recurring misconceptions—additive ratio thinking, area-versus-perimeter unit confusion, and equation-solving balance errors.',
      stimulus:
        'At a teacher-directed 7th-grade math station, 3 students solve garden-planning problems. Given 3 cups of compost per 2 planter boxes, one student adds 8 to get 11 cups for 10 boxes instead of scaling proportionally. On an 8-foot by 5-foot rectangular bed, another computes 8 + 5 + 8 + 5 = 26 and labels the area "26 square feet." On the equation 2x + 4 = 18, a third adds 4 to both sides, getting 2x = 22 and x = 11.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Verify the accurate solutions (15 cups, 40 square feet vs. 26 feet, and x = 7) and name the underlying misconception in each student’s work.',
        'B. Select concrete representations and guiding questions—ratio tables, grid-array diagrams, and balance/substitution checks—aligned to the teacher’s methods.',
        'C. Explain how you will document station progress for the teacher while respecting paraprofessional instructional boundaries.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Confirm exact values: 3 cups per 2 boxes scales by 5 to 15 cups for 10 boxes (1.5 cups/box); an 8-by-5 rectangle has perimeter 26 feet and area 40 square feet; 2x + 4 = 18 yields 2x = 14 and x = 7.'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Connect proportional scaling to multiplicative unit rates, separate 1D boundary length (feet) from 2D interior coverage (square feet), and treat equation solving as preserving equality verified by substitution.'
        },
        {
          label: 'Support plan',
          guidance:
            'Build a 2-row ratio table (2, 4, 6, 8, and 10 boxes matched with 3, 6, 9, 12, and 15 cups), sketch an 8-by-5 unit-square grid, and ask the third student to plug x = 11 back into 2(11) + 4 = 26 to discover why subtracting 4 is required.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Have each student verify their revised answer with units or substitution, then deliver a brief station summary noting which misconceptions resolved with visual prompts and which need teacher follow-up.'
        }
      ],
      successCriteria: [
        'Verifies all three solutions accurately: 15 cups of compost (unit rate 1.5 cups/box), 40 square feet for area versus 26 feet for perimeter, and x = 7 for 2x + 4 = 18.',
        'Diagnoses additive thinking in ratios (+8 instead of times 5), formula/unit conflation in perimeter vs. area, and using addition instead of the inverse operation (subtraction) to undo +4.',
        'Uses visual and self-checking tools (ratio table, 8-by-5 grid sketch, and plugging x = 11 vs. x = 7 into 2x + 4) so students catch their own errors.',
        'Stays within the teacher’s station framework, never introducing conflicting shortcut rules or altering official station grades.'
      ],
      commonPitfalls: [
        'Accepting "26 square feet" as almost right without separating linear feet (fencing around the edge) from square feet (covering the soil surface).',
        'Solving 2x + 4 = 18 on the student’s paper yourself instead of letting substitution (2 times 11 plus 4 equals 26, not 18) expose the error.',
        'Explaining ratios only with abstract cross-multiplication while the student still believes adding 8 to both quantities preserves the ratio.',
        'Inventing a brand-new homework worksheet on your own rather than reporting the station’s misconception log to the teacher.'
      ],
      sampleOutline: [
        'Verified math & error diagnosis: 3/2 = 15/10 (additive +8 error gave 11); 8 ft by 5 ft has area 40 sq ft and perimeter 26 ft; 2x + 4 = 18 yields 2x = 14 and x = 7 (adding 4 gave 2x = 22 and x = 11).',
        'Proportional & geometry scaffolds: extend a ratio table by pairs (2 boxes/3 cups up to 10 boxes/15 cups) and draw an 8-by-5 grid so students contrast 26 boundary segments (ft) against 40 tiled squares (sq ft).',
        'Equation-check scaffold: prompt the student to substitute x = 11 into 2x + 4 (getting 26, not 18), identify the inverse of adding 4 as subtracting 4, solve 2x = 14 to get x = 7, and re-verify 2(7) + 4 = 18.',
        'Teacher coordination: keep the teacher’s station sequence intact and pass along concise notes on multiplicative scaling, unit labels, and inverse operations.'
      ],
      references: [
        'https://openstax.org/details/books/prealgebra-2e/',
        'https://www.ets.org/pdfs/parapro/1755.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'parapro-workshop-05',
      taskType: 'Writing mechanics & revision support workshop (unscored)',
      title: 'Coaching grammar, sentence boundaries, and dangling modifiers without rewriting student work',
      prompt:
        'Following a 7th-grade ELA teacher’s editing checklist, plan a focused paraprofessional writing conference that helps a student spot and revise agreement, comma-splice, modifier, and usage errors while retaining full authorship.',
      stimulus:
        'Following the 7th-grade teacher’s editing checklist, you conference with a student over this draft: "The box of science supplies were sitting by the door, we carried them to lab. Walking quickly down the hall, the beakers nearly slipped out of my hands. Their is two charts we need to finish before Friday." The student asks you to fix every error with a red pen so they can submit a clean draft immediately.',
      estimatedMinutes: 12,
      taskParts: [
        'A. Catalog each grammar, usage, and sentence-structure error in the 3-sentence draft and explain why each breaks standard conventions or clarity.',
        'B. Prioritize 2 high-leverage targets from the teacher’s checklist and script guiding questions that help the student hear and revise the sentences themselves.',
        'C. Address the student’s request for a red-pen rewrite while upholding paraprofessional scope and preserving student ownership.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Identify all four issues: singular subject "box" paired with plural "were", a comma splice plus ambiguous "them" ("by the door, we carried them"), a dangling modifier ("beakers" walking down the hall), and homophone/agreement error ("Their is two charts").'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Keep the pencil or keyboard in the student’s hands, focus on 1–2 checklist patterns at a time, and use read-aloud and concrete meaning questions so the writer learns transferable editing habits.'
        },
        {
          label: 'Support plan',
          guidance:
            'Have the student cross out the prepositional phrase "of science supplies" to match "box was", split the comma splice with a period or ", so", ask "Who was walking down the hall?" to revise to "I nearly dropped the beakers", and check "There are two charts."'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Ask the student to read their revised paragraph aloud to check flow, mark completed checklist boxes together, and note recurring agreement/homophone patterns for the supervising ELA teacher.'
        }
      ],
      successCriteria: [
        'Accurately spots all four errors: subject-verb agreement ("The box of science supplies was"), comma splice/pronoun clarity ("by the door. We carried the supplies"), dangling modifier ("Walking quickly down the hall, I nearly dropped the beakers"), and homophone/agreement ("There are two charts").',
        'Declines to red-pen rewrite the draft and keeps all editing decisions and physical revisions under the student’s control.',
        'Uses targeted meaning-based questions (such as "Who is doing the walking?" and "What single noun is sitting by the door?") tied directly to the teacher’s checklist.',
        'Paces feedback so the student is not overwhelmed and communicates observed editing needs back to the classroom teacher.'
      ],
      commonPitfalls: [
        'Taking the red pen and rewriting all three sentences yourself to save time, which violates student authorship and hides true mastery from the teacher.',
        'Missing the subject-verb agreement trap because plural "supplies" sits right next to "were", or fixing "Their" to "There" while leaving "is two charts" uncorrected.',
        'Overlooking the dangling modifier ("the beakers" appearing to walk down the hall) because the sentence sounds casual at a quick glance.',
        'Giving an informal grade estimate or rewriting the teacher’s editing rubric during the conference.'
      ],
      sampleOutline: [
        'Error audit: (1) change "box of science supplies were" to "was"; (2) split the comma splice and clarify vague "them"; (3) fix the dangling modifier by naming "I" right after the opening phrase; (4) change "Their is two charts" to "There are two charts."',
        'Authorship boundary: kindly explain that the checklist is for building their editing eye, so they keep the pen while you coach one sentence at a time.',
        'Guided coaching: read aloud to hear the comma-splice pause, bracket "of science supplies" to find singular "box", ask "Can beakers walk down a hall?" to fix the modifier, and review the "there/their" anchor chart for "There are two charts."',
        'Closure & teacher note: have the student re-read the polished draft for clarity and log subject-verb agreement and homophone practice needs for the ELA teacher.'
      ],
      references: [
        'https://www.ets.org/pdfs/parapro/1755.pdf',
        'https://openstax.org/books/writing-guide/pages/handbook'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'parapro-workshop-06',
      taskType: 'Writing process & argument support workshop (unscored)',
      title: 'Scaffolding claim-evidence unity and overcoming writer’s block in 8th-grade persuasive writing',
      prompt:
        'Supporting an 8th-grade persuasive-writing workshop under teacher direction, design brief coaching moves for one student whose draft lacks source attribution and paragraph unity and another student frozen by a blank screen.',
      stimulus:
        'During an 8th-grade persuasive workshop on extending library hours, the teacher asks you to check in with 3 students using the class organizer and rubric. One student states a clear claim, then pastes two unattributed statistics from a class packet without explaining them and pivots mid-paragraph to cafeteria complaints. Another stares at a blank screen for 10 minutes saying, "I have ideas, I just cannot start."',
      estimatedMinutes: 12,
      taskParts: [
        'A. Diagnose the organizational, evidence-integration, and prewriting-initiation barriers shown by the two students.',
        'B. Plan targeted, teacher-aligned scaffolds for paragraph unity, basic source attribution and reasoning, and low-friction drafting entry that preserve each student’s voice.',
        'C. Clarify how you will coordinate authorized accessibility tools and report progress to the supervising teacher without stepping outside paraprofessional scope.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Distinguish the drafting-organization issue (unattributed packet statistics, missing warrant/explanation, and off-topic cafeteria detour) from the prewriting initiation barrier (oral ideas present, blank-page freeze).'
        },
        {
          label: 'Instructional principle',
          guidance:
            'Support the writing process—planning, drafting, and revising—with audience-aware claim-evidence-reasoning organizers and oral-to-written bridges while keeping every argument and sentence student-authored.'
        },
        {
          label: 'Support plan',
          guidance:
            'Guide Student 1 to color-code sentences against the library-hours claim, cut/move the cafeteria lines, add simple source tags ("According to the class packet"), and write one "This shows why" link; invite Student 2 to talk through 3 bullet ideas on the teacher’s organizer or use permitted speech-to-text before drafting a rough opener.'
        },
        {
          label: 'Check & follow-up',
          guidance:
            'Check back in 8 minutes to verify Student 1 added attribution/explanation and Student 2 moved from bullets to an opening claim, then share brief conference notes with the teacher rather than scoring the rubric.'
        }
      ],
      successCriteria: [
        'Addresses all three issues in Student 1’s paragraph: identifying the off-topic cafeteria drift, adding clear attribution to the class packet, and explaining how the statistics prove the library-hours claim.',
        'Unblocks Student 2 through oral brainstorming, teacher-provided graphic-organizer bullets, or pre-approved accessibility tools (such as speech-to-text if authorized) instead of dictating an introductory paragraph.',
        'Uses the classroom teacher’s existing organizer and rubric criteria as anchor points without altering assignment expectations or scoring the essay.',
        'Includes a concrete short-interval check-in and concise status report back to the supervising teacher.'
      ],
      commonPitfalls: [
        'Dictating an opening hook and thesis statement for the stalled student to type word-for-word.',
        'Allowing unattributed statistics to stand on their own without prompting the student to credit the class packet and explain their relevance to the claim.',
        'Focusing first on minor spelling or comma fixes while the paragraph still veers off topic into cafeteria complaints.',
        'Telling the students what rubric score or letter grade their drafts would earn instead of leaving formal evaluation to the teacher.'
      ],
      sampleOutline: [
        'Conference diagnosis: Student 1 has a clear claim but drops in unattributed, unexplained statistics and breaks unity with cafeteria complaints; Student 2 has oral ideas but needs an initiation bridge.',
        'Revision support (Student 1): check each sentence against the library-hours claim, relocate or cut the cafeteria detour, add a packet source tag ("According to the district survey in our packet"), and prompt a one-sentence "This matters because" explanation.',
        'Prewriting support (Student 2): shift from the blank screen to the teacher’s organizer—have the student speak their position and two reasons aloud while jotting 3 short phrases (or using authorized speech-to-text) to draft a rough starting sentence.',
        'Follow-up & scope: return after 8 minutes to affirm independent momentum, never assign rubric grades, and brief the teacher on source-citation and drafting-start needs.'
      ],
      references: [
        'https://openstax.org/books/writing-guide/pages/16-5-writing-process-thinking-critically-about-text',
        'https://www.ets.org/pdfs/parapro/1755.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    }
  ]
};

module.exports = {
  early_childhood_5025,
  parapro
};
