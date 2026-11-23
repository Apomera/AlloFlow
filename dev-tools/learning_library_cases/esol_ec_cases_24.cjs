'use strict';

const APPLIED_CLASSROOM_CASE_LABELS = {
  schemaVersion: 1,
  label: 'Applied classroom case',
  presentationLabel: 'Classroom scenario',
  answerLabel: 'Best instructional decision',
  explanationLabel: 'Evidence-based rationale'
};

const esol_5362 = {
  'esol5362-ch-01-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Unpacking Passive Voice and Clause Roles in Science Texts',
    clinicalDescription:
      'Seventh-grade Spanish-speaking English learners at WIDA Level 3 write clear active science sentences, yet misread passive clauses like "Water vapor is cooled by rising air" as water vapor cooling the air. They score 4/10 on cause-and-effect checks and misplace embedded relative clauses when summarizing lab procedures.',
    diagnosis:
      'Use color-coded constituent strips and clause-combining charts to contrast active and passive agent-patient roles in science texts.',
    explanation:
      'Explicit syntactic analysis of constituents and passive voice directly unpacks how academic English shifts the grammatical subject from the actor to the affected process. Drilling isolated past participles or rewriting every passage into short active sentences leaves learners unable to read grade-level disciplinary prose.'
  },
  'esol5362-ch-02-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Building Discourse Cohesion and Peer Repair in Social Studies',
    clinicalDescription:
      'Tenth-grade multilingual learners generate strong claims during social studies debates, yet their persuasive essays read as disconnected bullets. Writing samples show repeated full noun phrases instead of pronoun reference, sparse contrastive markers, and stalled peer conferences whenever partners need clarification.',
    diagnosis:
      'Model cohesive reference chains, contrastive discourse markers, and structured clarification-repair stems using mentor essays before peer revision.',
    explanation:
      'Teaching explicit cohesion devices and conversational repair strategies equips students to link ideas across extended academic discourse and negotiate meaning autonomously. Correcting surface spelling alone or grading essay organization without modeling text-level cohesion fails to develop academic discourse competence.'
  },
  'esol5362-ch-03-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Shifting from Mechanical Drills to Meaningful Communicative Retrieval',
    clinicalDescription:
      'High school newcomers complete conditional-verb fill-in-the-blank warm-ups at 92% accuracy, yet revert to bare infinitives during unscripted career-interview role-plays. Attendance logs and exit notes show rising disengagement when lessons center on repetitive choral grammar drills disconnected from their goals.',
    diagnosis:
      'Embed spaced communicative retrieval tasks tied to students\' real career goals using authentic interview rehearsals and iterative feedback cycles.',
    explanation:
      'Transfer from explicit rule knowledge to fluent automatization requires meaningful communicative retrieval coupled with learner investment in valued real-world identities. Extending decontextualized gap-fill drills raises worksheet scores without strengthening spontaneous speaking or sustained student motivation.'
  },
  'esol5362-ch-04-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Supporting an Adolescent SLIFE Learner Without Infantile Materials',
    clinicalDescription:
      'A 15-year-old SLIFE newcomer with strong oral Arabic and practical numeracy from family commerce struggles with printed English biology labs and avoids speaking in front of ninth-grade peers. Screening places him at Entering proficiency, yet he solves lab problems accurately when reasoning orally with a bilingual peer.',
    diagnosis:
      'Provide age-respectful sheltered biology texts, strategic home-language translanguaging bridges, and explicit adolescent literacy coaching.',
    explanation:
      'Adolescent SLIFE learners need intellectually rigorous, identity-affirming materials that leverage oral reasoning and full linguistic repertoires while building foundational print skills. Assigning primary-grade phonics readers undermines adolescent identity and restricts opportunity to learn grade-level content.'
  },
  'esol5362-ch-05-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Replacing Permanent Isolation with Flexible Grouping and Tiered Tech',
    clinicalDescription:
      'In a fifth-grade SIOP unit on renewable energy spanning WIDA Levels 1 through 5, Level 1 and Level 2 learners sit permanently at a separate back table using a translation app to copy English paragraphs. They rarely speak with peers, and their copied drafts reveal little independent academic language growth.',
    diagnosis:
      'Organize flexible cross-proficiency groups with tiered language objectives, visual word banks, and audio-recording tools for oral drafting.',
    explanation:
      'Flexible grouping with differentiated language scaffolds and purposeful audio-drafting tools preserves shared grade-level rigor while expanding academic interaction. Permanently segregating newcomers with unguided machine translation restricts comprehensible peer talk and masks actual English language development.'
  },
  'esol5362-ch-06-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Prioritizing Intelligibility Over Accent Elimination in Presentations',
    clinicalDescription:
      'During eighth-grade history presentations, a Korean-speaking student delivers well-organized arguments with precise vocabulary, yet classmates miss key dates and contrasts because syllable stress shifts on multisyllabic words and final consonant clusters are simplified. Peers hesitate to ask follow-up questions.',
    diagnosis:
      'Deliver targeted focus-on-form mini-lessons on word stress, intonation, and high-functional-load contrasts with recorded self-monitoring clips.',
    explanation:
      'Prioritizing intelligibility through prosody, stress, and high-functional-load sound contrasts yields measurable gains in listener comprehension while honoring the student\'s multilingual voice. Interrupting every spoken error or pursuing native-like accent elimination raises anxiety and stalls communicative fluency.'
  },
  'esol5362-ch-07-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Interpreting Norm-Referenced vs. Criterion-Referenced ELP Data',
    clinicalDescription:
      'A middle school counselor recommends placing a seventh-grade English learner in remedial reading solely because her norm-referenced reading percentile fell to the 14th percentile. Meanwhile, her criterion-referenced WIDA ACCESS composite rose from 2.4 to 3.7, and scaffolded classroom work shows steady literacy growth.',
    diagnosis:
      'Pair criterion-referenced ELP growth descriptors with curriculum-based classroom evidence to plan language-scaffolded core literacy placement.',
    explanation:
      'Norm-referenced tests standardized mainly on English-monolingual peers conflate developing English proficiency with reading disability, whereas criterion-referenced ELP frameworks measure authentic growth against clear benchmarks. Making placement decisions from one norm-referenced percentile compromises validity and equity.'
  },
  'esol5362-ch-08-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Acting on Post-Exit Monitoring Evidence for Reclassified Learners',
    clinicalDescription:
      'A fourth grader met the state ELP composite exit threshold of 4.8 and exited ESOL services in June. By October of fifth grade, content teachers observe fluent oral participation during group labs, yet her scores on science constructed responses sit at 45% due to dense academic syntax and missing evidence frames.',
    diagnosis:
      'Initiate ESSA-required post-exit progress monitoring across content classes and provide targeted academic-writing support or re-entry review.',
    explanation:
      'Federal ESSA rules require districts to monitor reclassified former English learners for at least two years using multiple academic indicators so rising disciplinary literacy demands do not go unaddressed. Treating exit as a permanent cutoff ignores the gap between social fluency and advanced academic writing.'
  },
  'esol5362-ch-09-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Reframing Cultural Interactional Norms in Classroom Discussions',
    clinicalDescription:
      'A sixth-grade teacher deducts participation points from three newly arrived learners who avert eye contact during corrective feedback and wait silently until invited rather than jumping into rapid whole-class debates. The teacher records their quiet demeanor as low motivation despite solid written exit tickets.',
    diagnosis:
      'Examine cultural interactional norms, explicitly teach local turn-taking routines, and offer multiple equitable participation pathways.',
    explanation:
      'Wait time, turn-taking, and gaze patterns vary widely across cultures; treating dominant classroom habits as universal markers of engagement misreads respectful deference as apathy. Penalizing silence without teaching explicit discussion routines or adding structured partner protocols marginalizes diverse learners.'
  },
  'esol5362-ch-10-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Upholding Plyler Data Minimization and Language Access for Families',
    clinicalDescription:
      'Before an elementary family conference night, front-office staff ask multilingual parents for driver licenses and informal details about household immigration status, while relying on a bilingual fifth grader to interpret sensitive academic concern notes. Family attendance and phone responses drop sharply the next week.',
    diagnosis:
      'Halt immigration-status inquiries under Plyler v. Doe, provide qualified adult interpreters, and repair trust through accessible family outreach.',
    explanation:
      'Under Plyler v. Doe and Title VI language-access mandates, schools must practice strict data minimization regarding immigration status and provide trained adult interpreters so parents engage as informed partners. Using children to interpret or collecting unnecessary legal data violates civil rights and damages family trust.'
  },
  'esol5362-ch-11-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Protecting Privacy, Informed Consent, and Scope in MTSS Referrals',
    clinicalDescription:
      'After ten weeks of U.S. schooling, a second-grade teacher asks the ESOL specialist to sign off on a special education referral for a newcomer and discusses the child\'s home-language survey aloud in a shared staff lounge. No native-language literacy screening or home-language parent consultation has occurred yet.',
    diagnosis:
      'Protect student confidentiality under FERPA, distinguish second-language acquisition from disability, and convene a data-based team with parent consent.',
    explanation:
      'ESOL specialists safeguard student privacy, obtain informed family consent in a home language, and examine native-language literacy and instructional opportunity before any disability referral. Diagnosing outside one\'s professional scope or bypassing bilingual data risks misidentifying normal acquisition as disability.'
  },
  'esol5362-ch-12-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Addressing Segregated EL Tracks and Opt-Out Civil Rights Protections',
    clinicalDescription:
      'A middle school assigns all English learners to an isolated wing for core math and science all day without certified ESOL teachers, while telling parents who opted out of direct pullout services that the school no longer needs to monitor their child\'s English progress or provide classroom language accommodations.',
    diagnosis:
      'Audit program compliance under Lau, Castañeda, and Title VI standards to end unnecessary segregation and ensure classroom access for opt-out students.',
    explanation:
      'Under Lau v. Nichols, Castañeda v. Pickard, and federal civil rights guidance, EL programs must be research-based, adequately resourced, non-segregative beyond justified instructional need, and effective; opt-out students retain annual ELP testing and core access rights. Sustaining unstaffed separate tracks violates law.'
  }
};

const early_childhood_5025 = {
  'ec5025-ch-01-section-3': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Bridging Environmental Print to Speech-to-Print Mapping in Pre-K',
    clinicalDescription:
      'Several four-year-olds reliably name familiar cereal boxes and stop signs in the dramatic play center and retell weekend stories in clear sequence. Yet when shown the exact same words in plain black font without logos or colors, they cannot name initial letters or segment spoken words into separate sounds.',
    diagnosis:
      'Pair dialogic read-alouds and shared interactive writing with explicit print referencing and playful phonological awareness games.',
    explanation:
      'Recognizing environmental print depends on visual logos rather than alphabetic mapping; connecting children\'s strong oral storytelling to explicit print awareness and sound-symbol games builds both pillars of the Simple View of Reading. Relying on logo recognition alone or silent copying drills misses speech-to-print mapping.'
  },
  'ec5025-ch-02-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Replacing Picture Guessing with Decoding and Spelling Reciprocity',
    clinicalDescription:
      'First graders decode CVC words accurately during whole-group phonics drills, yet during small-group reading they guess "pony" for "horse" from illustrations, spell "said" as "sed" in journals, and skip middle vowels when attempting unfamiliar digraph words inside predictable leveled books.',
    diagnosis:
      'Prompt full left-to-right decoding in matched decodable texts, reinforce spelling via dictation, and teach irregular parts of "said" explicitly.',
    explanation:
      'Miscue error analysis reveals dependence on picture guessing instead of orthographic mapping; pairing decodable texts with phonics-to-spelling dictation and explicit analysis of irregular spellings cements reliable word reading. Prompting children to check pictures or memorize whole word shapes stalls independent decoding.'
  },
  'ec5025-ch-03-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Deepening Inferential Comprehension and Genre Purpose in Grade 2',
    clinicalDescription:
      'During a second-grade unit pairing folktales with animal field guides, students answer literal recall questions about characters and habitats at 90% accuracy. However, fewer than one-third can infer character motivations or explain why informational texts use headings and captions differently from narrative stories.',
    diagnosis:
      'Use culturally authentic paired texts, activate background knowledge before reading, and model inferential questioning with genre-purpose charts.',
    explanation:
      'Deep comprehension requires connecting activated prior knowledge and text structure to inferential reasoning, while culturally authentic literature sustains engagement across diverse backgrounds. Restricting discussion to literal recall checks or offering only simplified stories leaves inferential comprehension underdeveloped.'
  },
  'ec5025-ch-04-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Repairing Equal-Sign and Place-Value Regrouping Misconceptions',
    clinicalDescription:
      'Half of a second-grade class solves 7 + 5 = ___ accurately, yet writes 12 in the blank for 7 + 5 = ___ + 4. On subtraction checks, the same students compute 42 - 17 as 35 by subtracting the smaller digit from the larger in the ones place without regrouping a ten or checking their answers.',
    diagnosis:
      'Use pan-balance models to teach the equal sign as equivalence and base-ten blocks with inverse addition checks to ground place-value regrouping.',
    explanation:
      'Treating the equal sign as a "put the answer here" command and subtracting digit-by-digit stem from rote procedures detached from relational equivalence and base-ten value. Balance-scale reasoning and concrete regrouping with inverse checks build durable conceptual accuracy that timed flashcard drills cannot fix.'
  },
  'ec5025-ch-05-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Correcting Ruler Alignment and Inverse Unit-Size Thinking in Grade 1',
    clinicalDescription:
      'First graders measuring a storybook line its edge up with the 1-inch mark on a ruler and record 9 inches instead of 8. During a follow-up exploration, most predict that measuring their desk with small paper clips will produce a smaller number than measuring the same desk with long craft sticks.',
    diagnosis:
      'Guide hands-on unit iteration with explicit zero-mark ruler alignment and side-by-side comparisons showing why smaller units yield larger counts.',
    explanation:
      'Starting at the 1-inch mark confuses numbered hash lines with unit intervals, while assuming smaller units produce smaller counts misses the inverse relationship between unit size and count. Direct concrete iteration builds lasting measurement understanding far better than memorizing ruler steps from a worksheet.'
  },
  'ec5025-ch-06-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Building Orientation-Invariant Shape Identity and Defining Attributes',
    clinicalDescription:
      'Kindergarten and first-grade learners accurately label upright equilateral triangles, yet reject a rotated right triangle as "not a triangle" and insist a square cannot be a rectangle because "rectangles must be long." Several second graders also confuse the distance around a rug with the tiles covering it.',
    diagnosis:
      'Facilitate attribute-sorting investigations with rotated non-prototypical shapes and require children to justify groupings by defining properties.',
    explanation:
      'Young children often classify shapes by rigid visual prototypes rather than defining geometric properties such as side count, closedness, and right angles. Sorting rotated examples and comparing defining attributes builds orientation invariance and hierarchical reasoning, whereas standard poster cutouts reinforce myths.'
  },
  'ec5025-ch-07-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Replacing Cultural Stereotypes with Anti-Bias Inquiry and Civic Voice',
    clinicalDescription:
      'For a first-grade community traditions unit, a planned "dress-up cultures day" includes paper feathered headdresses alongside a brief lecture stating that people in the past simply "did not know any better." Meanwhile, classroom rules are posted solely by the teacher without discussing fairness with children.',
    diagnosis:
      'Replace costume stereotypes with anti-bias primary artifacts, invite authentic family perspectives, and co-construct fair class agreements together.',
    explanation:
      'Anti-bias social studies respects living cultures without caricature, nurtures historical empathy through primary artifacts instead of presentism, and teaches rule-of-law fairness through age-appropriate civic agency. Superficial costume crafts and unilateral rules reduce culture to stereotype and limit democratic learning.'
  },
  'ec5025-ch-08-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Connecting Globe Comparisons, Interdependence, and Civic Choice',
    clinicalDescription:
      'Second graders notice that a flat wall map makes Greenland appear larger than South America and assume grocery stores manufacture all food inside the store. At the same time, they disagree on whether to spend a small class grant on extra playground balls or native pollinator plants for the schoolyard.',
    diagnosis:
      'Compare a globe with flat maps to inspect distortion, trace local food supply chains, and hold an evidence-based deliberative vote on the grant.',
    explanation:
      'Comparing globes and flat projections clarifies spatial distortion concretely, while mapping producers, transport, and trade-offs builds authentic understanding of economic interdependence and civic deliberation. Treating flat maps as distortion-free or picking the purchase unilaterally forfeits rich social inquiry.'
  },
  'ec5025-ch-09-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Testing Conservation of Mass and Lab Safety in Primary Science',
    clinicalDescription:
      'Third graders predict that a sealed bag of ice will weigh less once it melts because "liquid water is lighter than solid ice," and several argue summer is warmer because Earth orbits closer to the Sun. During a solubility station, a child lifts an unlabeled white powder toward his mouth to test if it is salt.',
    diagnosis:
      'Enforce strict no-tasting lab safety immediately, weigh sealed ice before and after melting, and model seasons using a tilted globe and lamp.',
    explanation:
      'Measuring mass in a closed system refutes conservation-of-mass misconceptions with direct evidence, while a tilted-axis globe demonstrates seasonal sunlight angles rather than orbital distance. Addressing lab safety immediately and teaching through safe hands-on investigation outperforms abstract textbook lecturing.'
  },
  'ec5025-ch-10-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Clarifying Living Criteria, Generational Adaptation, and Habitat Ethics',
    clinicalDescription:
      'Kindergarteners classify moving wind-up toys and flowing streams as "living" while calling dormant bean seeds "nonliving." In a nearby second-grade class, students claim polar bears "chose to grow white fur because they were cold" and suggest releasing the class pet turtle into a neighborhood pond in June.',
    diagnosis:
      'Sort examples using biological life criteria, model trait survival across generations, and teach ethical pet care without wild release.',
    explanation:
      'Grounding living-versus-nonliving classification in growth, metabolism, and reproduction resolves motion-based animism, while modeling generational trait survival counters intentional-change myths. Prohibiting release of non-native classroom pets protects local habitats and models responsible environmental stewardship.'
  },
  'ec5025-ch-11-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Enforcing Allergen Safety and Inclusive Active Play in Preschool',
    clinicalDescription:
      'A preschool class includes a child with a documented severe peanut allergy and a peer who uses a walker. A parent drops off an unlabeled cookie tray for birthday snack, and the afternoon movement plan features an elimination tag game that benches children early while assigning the walker user to keep score.',
    diagnosis:
      'Follow written allergen and medication protocols with verified snacks, and adapt cooperative active games for universal mobility participation.',
    explanation:
      'Strict adherence to individualized allergy plans and verified ingredient rules prevents life-threatening anaphylaxis, while non-elimination cooperative movement games with inclusive mobility adaptations promote physical development and belonging for all learners. Serving unverified food or sidelining a child harms safety and equity.'
  },
  'ec5025-ch-12-section-4': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Choosing Safe Process Art Over Pre-Cut Product Crafts in Kindergarten',
    clinicalDescription:
      'For an autumn hallway display, a kindergarten teacher pre-cuts identical orange pumpkin silhouettes and directs children to glue paper eyes onto pre-marked dots so every finished craft matches the model. She also plans to trace each child\'s work with adult solvent-based markers to make the display look tidy.',
    diagnosis:
      'Provide AP-certified nontoxic open-ended media for child-led process art, invite creative revision talks, and connect work to diverse artists.',
    explanation:
      'Open-ended process art using safe AP-certified materials cultivates fine-motor coordination, expressive agency, and iterative creative revision while honoring cultural art contexts. Pre-cut identical product crafts with unsafe adult markers stifle originality and teach children that uniform compliance matters more than expression.'
  }
};

module.exports = {
  esol_5362,
  early_childhood_5025
};
