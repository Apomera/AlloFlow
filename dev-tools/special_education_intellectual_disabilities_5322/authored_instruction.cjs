'use strict';

const q = (promptA, promptB, correct, distractors, rationale, distractorNotes, difficulty = 'application') => ({
  promptA,
  promptB,
  correct,
  distractors,
  rationale,
  distractorNotes,
  difficulty,
});

const functionalLiteracy = [
  q(
    'A student is studying ecosystems with classmates but cannot independently decode the grade-level article. Which support best preserves substantive participation?',
    'During an inclusive science unit, complex text blocks access to the same concepts peers are analyzing. What should the special educator recommend?',
    'Provide adapted text with read-aloud or symbol supports while preserving core ecosystem concepts and expression.',
    [
      'Assign an unrelated coloring worksheet in the corner because the grade-level science article is too complex.',
      'Require independent print decoding of the article before permitting participation in the science group discussion.',
      'Ask a paraprofessional to answer every comprehension prompt aloud without presenting the ecosystem reading.',
    ],
    'Access supports should reduce the print barrier without replacing the academic construct. Retaining the shared concepts and an independent response mode supports inclusion, presumes competence, and produces meaningful evidence of comprehension.',
    [
      'Substituting an unrelated low-demand coloring sheet removes access to grade-level science concepts and undermines meaningful classroom inclusion.',
      'Withholding science participation until independent decoding is mastered confuses print access with conceptual understanding of ecosystems.',
      'Having an aide supply answers without engaging the student removes agency and produces no valid evidence of what the learner understands.',
    ]
  ),
  q(
    'A learner recognizes grocery words on flash cards but not on aisle signs or a family shopping list. Which instruction is most likely to make the skill useful?',
    'A student reads practiced labels at a desk but cannot locate the same items during a school-store routine. What should happen next?',
    'Teach target words in age-respectful shopping routines across varied lists, fonts, locations, and choices.',
    [
      'Continue seated flash-card drills at the same classroom desk until every oral response becomes instantaneous.',
      'Replace all printed shopping lists and aisle signs with spoken adult directions during community outings.',
      'Limit community shopping instruction to one identical store shelf display so visual cues stay unchanged.',
    ],
    'Authentic practice with varied examples connects word recognition to purposeful action and communication. Programming variation and support fading builds generalization rather than restricting performance to one memorized material set.',
    [
      'Drilling isolated desk flashcards strengthens narrow material-specific recall without programming transfer to real aisle signs and lists.',
      'Replacing print entirely with spoken adult commands prevents literacy growth and builds dependence on adult verbal direction.',
      'Restricting practice to one fixed display fails to prepare the learner for natural variations in fonts, packaging, and store layouts.',
    ]
  ),
  q(
    'A student is beginning to connect sounds and letters and enjoys shared stories. Which literacy plan is most appropriate?',
    'Emergent decoding data show a small but growing sound-symbol repertoire. What should instruction include?',
    'Deliver explicit, systematic phonics with cumulative review and prompt application in age-respectful text.',
    [
      'Wait for decoding skills to emerge spontaneously during story time because explicit teaching limits autonomy.',
      'Drill isolated letter-sound cards exclusively while postponing access to shared stories and connected books.',
      'Use early-childhood board books designed for toddlers regardless of the student’s chronological age or interests.',
    ],
    'Systematic teaching and cumulative practice address skill acquisition, while meaningful age-respectful text sustains purpose and access to literacy. The plan avoids assuming that current performance limits future learning.',
    [
      'Waiting for spontaneous decoding leaves emerging sound-symbol knowledge underdeveloped when systematic explicit instruction accelerates literacy growth.',
      'Restricting literacy to isolated cards denies meaningful comprehension, vocabulary, and authentic motivation found in shared stories.',
      'Using toddler materials with older learners undermines dignity and engagement when age-respectful accessible texts can teach the exact same skills.',
    ]
  ),
  q(
    'A student can select a new vocabulary symbol during drill but not during class discussion. How should vocabulary instruction change?',
    'A learner recognizes a target word in one picture yet misses it across real objects, photographs, and spoken examples. Which approach is best?',
    'Teach the concept across varied examples and nonexamples, link familiar experiences, and build accessible use.',
    [
      'Repeat the identical flashcard picture until selection stays accurate and record the vocabulary word as mastered.',
      'Require spoken verbal definitions as the sole acceptable demonstration of vocabulary mastery during lessons.',
      'Introduce a dozen unrelated new vocabulary terms simultaneously without verifying conceptual understanding.',
    ],
    'Concept learning requires more than association with one picture. Multiple exemplars, explicit connections, and accessible receptive and expressive responses reveal understanding and support use across instructional contexts.',
    [
      'Memorizing one symbol picture creates a narrow visual association rather than genuine conceptual generalization across real objects and discussions.',
      'Demanding spoken speech confounds expressive speech demands with vocabulary understanding and excludes valid AAC or multimodal responses.',
      'Introducing many unrelated words at once overloads working memory and prevents deep mastery of any single functional concept.',
    ]
  ),
  q(
    'A student listens to a short passage and answers accurately by selecting pictures but gives no spoken response. How should the teacher interpret the result?',
    'During comprehension checks, a learner needs wait time and uses eye gaze rather than speech. What is the strongest assessment practice?',
    'Honor the accessible response mode, provide planned wait time, and verify comprehension across contexts.',
    [
      'Record every nonspeaking picture or eye-gaze selection as incorrect on the formal reading rubric.',
      'Have a classroom adult point toward the intended picture choice before waiting for the student’s response.',
      'Conclude from one accurate picture selection that comprehension is mastered and stop further assessment.',
    ],
    'Comprehension should not be confounded with speech production or partner prompting. Accessible responding, adequate processing time, and repeated evidence provide a more valid picture of what the student understands.',
    [
      'Marking valid AAC, picture, or eye-gaze answers incorrect measures speech production instead of the target listening-comprehension construct.',
      'Having an adult point beforehand invalidates assessment data by substituting partner prompting for independent learner comprehension.',
      'A single correct selection can occur by chance; repeated checks across varied passages confirm genuine comprehension.',
    ]
  ),
  q(
    'During shared reading, a student uses AAC to contribute a repeated line but partners often read it for the student. Which revision best supports participation?',
    'A learner has a predictable message programmed for a class story but adults move ahead without pausing. What should the team do?',
    'Pause at natural story cues, allow planned wait time, and honor the student’s AAC contribution in the group.',
    [
      'Remove the student’s programmed story line so the whole-class shared reading maintains brisk pacing.',
      'Apply immediate hand-over-hand physical prompting on every page before giving the student time to initiate.',
      'Ask the paraprofessional to read the repeated line aloud while keeping the AAC device muted on the tray.',
    ],
    'Planned opportunities and sufficient wait time make the student an active literacy participant. Natural cues and honored AAC messages support agency, communication, and understanding without substituting an adult response.',
    [
      'Dropping the student’s turn removes authentic literacy participation and peer belonging simply for adult pacing convenience.',
      'Delivering immediate hand-over-hand physical prompting before waiting cuts off independent student initiation and builds lasting physical prompt dependence.',
      'Having an adult speak instead of honoring the student’s AAC silences the learner’s voice and wastes a planned communication routine.',
    ]
  ),
  q(
    'A team assumes that a student who does not yet name letters should receive only picture matching. Which response is most educationally defensible?',
    'A learner has limited conventional reading responses but attends to print and stories. What should guide instruction?',
    'Presume learning capacity, assess emergent literacy directly, and teach print, sound, and meaning accessibly.',
    [
      'Limit literacy programming permanently to simple picture-matching tasks based on current baseline performance.',
      'Postpone exposing the student to printed letters and books until fluent oral letter naming is demonstrated.',
      'Design the literacy curriculum from the student’s eligibility classification instead of gathering direct data.',
    ],
    'Current response form does not establish a ceiling on literacy growth. Direct assessment and systematic, multimodal teaching create opportunities to learn while data guide the intensity and accessibility of instruction.',
    [
      'Restricting literacy instruction permanently to picture matching imposes an artificial learning ceiling and denies systematic, ambitious literacy opportunities.',
      'Waiting for spoken letter naming excludes nonspeaking and emerging learners who can build print and phonics skills through accessible response modes.',
      'Basing literacy ceilings on an eligibility label violates IDEA individualization and ignores direct emergent-literacy assessment evidence.',
    ]
  ),
  q(
    'A student learns to read an EXIT sign in the classroom. What is needed before calling the safety skill generalized?',
    'A learner identifies one practiced warning label but encounters different formats in school and the community. Which next step is best?',
    'Teach and probe sign meaning across varied authentic locations, safe actions, and accessible help requests.',
    [
      'Use accuracy on the original laminated classroom sign card as the final criterion for community mastery.',
      'Focus instruction strictly on reading the printed word aloud without linking it to the safe physical action.',
      'Send the student independently into unfamiliar community settings to test whether safety signs transfer.',
    ],
    'Functional literacy includes understanding and acting safely, not merely naming a practiced card. Varied, supervised examples and communication access build generalization while protecting the learner during instruction.',
    [
      'Recognizing one familiar classroom card does not verify transfer to illuminated, colored, or varied signage in real buildings.',
      'Naming a safety word without performing the corresponding safe action fails to establish a functional, protective life skill.',
      'Placing a learner alone in unfamiliar environments before supervised generalization checks compromises physical safety and duty of care.',
    ]
  ),
  q(
    'A student reads a visual recipe only after an adult points to each step. How should the teacher reduce prompt dependence?',
    'An adult cue, rather than the printed sequence, controls a literacy routine. Which instructional adjustment is strongest?',
    'Use a planned prompt hierarchy and time delay to shift control to the visual text while tracking independence.',
    [
      'Keep continuous adult pointing in place at every recipe step so the student maintains errorless performance.',
      'Remove the visual recipe checklist from the workstation and switch to spoken verbal directions for each step.',
      'End the cooking routine promptly whenever the student hesitates or skips a step on the visual recipe.',
    ],
    'Prompt fading and time delay shift stimulus control from the adult to the meaningful literacy support. Step-level data show whether independence is increasing without withdrawing assistance abruptly.',
    [
      'Immediate pointing keeps stimulus control permanently on the adult finger instead of transferring attention to the visual recipe.',
      'Removing the visual text replaces a portable independence tool with greater dependence on adult spoken instructions.',
      'Terminating the routine at the first hesitation punishes learning attempts and prevents systematic error correction and prompt fading.',
    ]
  ),
  q(
    'A literacy goal reports percent correct but every response follows a model. What additional evidence is needed?',
    'A learner answers comprehension questions accurately with heavy prompting. Which progress measure best supports an instructional decision?',
    'Track comprehension accuracy alongside response mode, prompt level, text conditions, and generalization.',
    [
      'Report overall percent accuracy alone while treating heavily prompted and independent answers identically.',
      'Log total minutes seated with an open book each day instead of tracking comprehension or prompt levels.',
      'Summarize literacy progress once at year’s end using informal impressions without repeated data samples.',
    ],
    'Accuracy can be misleading when access conditions and prompting vary. Recording independence, materials, and response mode lets the team determine whether comprehension is improving and which supports should be maintained or faded.',
    [
      'Combining modeled and independent responses inflates apparent mastery and hides whether the student is actually gaining autonomy.',
      'Time spent seated with a book measures passive exposure rather than active comprehension, response mode, or fading prompt needs.',
      'A single end-of-year impression lacks the repeated, objective progress data needed to adjust literacy supports during the year.',
    ]
  ),
];

const writingCommunication = [
  q(
    'A student uses AAC to choose a topic but an adult composes the entire message. Which change would make writing more student directed?',
    'During a class email task, staff select every word for a learner who can make meaningful choices through AAC. What should instruction emphasize?',
    'Provide generative AAC words and phrases so the student composes and revises with minimal needed prompts.',
    [
      'Have an adult compose a polished finished message and ask the student to nod approval before sending.',
      'Restrict the student’s writing assignment to copying one teacher-chosen sentence cleanly onto paper.',
      'Postpone all authentic writing tasks until the student can type independently on a standard keyboard.',
    ],
    'Writing instruction should preserve authorship, not merely produce an adult-created product. Accessible generation and revision choices reveal student intent while systematic support can be faded as competence grows.',
    [
      'Asking a student to approve adult-authored text preserves the appearance of writing while stripping away genuine learner authorship and voice.',
      'Restricting writing to copying staff sentences targets motor replication rather than generative communication and expressive composition.',
      'Delaying writing until standard keyboard fluency blocks access to authentic expression when AAC and adapted tools support authorship right now.',
    ]
  ),
  q(
    'During shared writing, a student activates a switch only to copy a teacher-selected sentence. Which redesign best supports expression?',
    'A learner participates in group writing but has no way to contribute original content. What should the teacher add?',
    'Elicit the student’s own ideas via accessible communication, include them visibly, and teach a composing step.',
    [
      'Continue switch-activated copying because generating original content is unnecessary during group writing.',
      'Invite helpful peers to guess and speak aloud what the student would probably want to add to the story.',
      'Move the student out of group writing to a separate table for isolated letter-tracing practice instead.',
    ],
    'Shared writing becomes substantive when the learner contributes meaning and receives explicit instruction in the composing process. Accessible authorship maintains inclusion and provides evidence beyond motor copying.',
    [
      'Limiting switch use to copying teacher text treats writing as mechanical activation rather than purposeful expression of student meaning.',
      'Having classmates guess the student’s thoughts substitutes peer assumptions for authentic, student-controlled communication choices and genuine authorship.',
      'Removing the student for isolated tracing reduces inclusive peer participation and substitutes fine-motor drills for genuine composing.',
    ]
  ),
  q(
    'A transition class is teaching students to complete community forms. Which lesson is most age respectful and useful?',
    'A student needs to enter contact information on an authentic application using an adapted keyboard. What approach is best?',
    'Teach relevant fields on realistic, privacy-protected forms with preferred access tools and systematic fading.',
    [
      'Use simplified preschool activity sheets because the visual boxes are larger and easier to complete.',
      'Have an adult fill out every community and job form so personal information is never entered inaccurately.',
      'Practice signing the student’s name repeatedly while skipping the rest of the required application fields.',
    ],
    'Authentic, age-respectful materials connect writing to self-determination and community participation. Privacy safeguards, accessible entry, and prompt fading build useful independence without reducing the task to imitation.',
    [
      'Using preschool worksheets with transition-age students undermines dignity and fails to teach authentic form fields needed in adult life.',
      'Having classroom adults complete every form prevents building self-determined functional writing skills and perpetuates unnecessary adult dependence.',
      'Practicing only a signature leaves essential contact, availability, and privacy-judgment skills untaught on real community applications.',
    ]
  ),
  q(
    'A student uses a symbol for stop during personal-care instruction, but staff continue the routine because the schedule is tight. What should the educator do?',
    'A learner communicates no during an activity and adults treat the message as meaningless behavior. Which response best supports self-advocacy?',
    'Honor the communication promptly, identify the concern, and teach safe ways to negotiate or resume.',
    [
      'Continue the scheduled routine despite the symbol so the student learns consistent compliance with adults.',
      'Remove the stop or no symbol from the student’s communication board to prevent routine interruptions.',
      'Require clear spoken refusal before staff pause an activity or check on the student’s comfort.',
    ],
    'A reliable way to refuse, pause, or seek help is fundamental communication and self-determination. Honoring the message establishes its meaning while instruction can address safety, alternatives, and any necessary return to activity.',
    [
      'Ignoring a clear stop message undermines personal safety, bodily autonomy, and trust in the communication system.',
      'Removing refusal symbols violates communication rights and leaves the learner with no safe way to express pain, distress, or withdrawal of assent.',
      'Requiring spoken speech from a symbol or AAC user denies accessible self-advocacy and invalidates established communication modes.',
    ]
  ),
  q(
    'A student has ideas for a report but cannot spell enough words to produce them conventionally. Which plan best balances access and instruction?',
    'Spelling and motor demands prevent a learner from showing content knowledge in writing. What should the team provide?',
    'Provide accessible composing tools such as word prediction, symbols, dictation, or AAC alongside explicit writing instruction.',
    [
      'Withhold content-area report writing until the student demonstrates conventional grade-level spelling accuracy.',
      'Accept copied textbook sentences in place of original ideas because copied drafts contain fewer spelling errors.',
      'Have an instructional aide rewrite the student’s report using simpler concepts that match spelling skills.',
    ],
    'Expression should not be blocked by a single transcription barrier. Alternate access permits authentic composition now, while targeted explicit instruction supports continued growth in spelling, language, or motor skills.',
    [
      'Withholding report writing until conventional spelling is mastered blocks the student from demonstrating strong content knowledge and ideas.',
      'Substituting copied sentences prioritizes surface neatness over original thinking and produces no evidence of independent composition.',
      'Replacing the student’s ideas with simpler content lowers cognitive rigor and strips away authentic learner authorship.',
    ]
  ),
  q(
    'A communication partner asks a question and immediately selects an AAC symbol for the student. What change is most important?',
    'A learner rarely initiates because adults anticipate needs and respond before a message is formed. What should partners practice?',
    'Create a natural opportunity, pause for the planned wait interval, attend to all modes, and respond contingently.',
    [
      'Deliver immediate hand-over-hand physical guidance right after asking a question so answers stay rapid.',
      'Speak on the student’s behalf during busy transitions so classroom schedules move smoothly without delays.',
      'Reserve independent AAC communication practice strictly for the weekly pull-out speech-language therapy session.',
    ],
    'Partner behavior can either enable or suppress communication. Planned wait time and contingent responses create genuine opportunities for initiation and reduce inadvertent prompt dependence or adult substitution.',
    [
      'Immediate physical prompting cuts off independent processing time and teaches the student to wait passively for adult hand guidance.',
      'Speaking for the student removes authentic communication turns during daily school routines and reinforces passive learned helplessness over time.',
      'Confining AAC initiation to weekly pull-out therapy denies functional communication across the real classroom contexts where it matters.',
    ]
  ),
  q(
    'A student independently requests help from one familiar aide but not from new staff. Which plan best supports generalization?',
    'A help request occurs in one classroom and with one familiar adult. What should the team do next?',
    'Practice the essential message with varied partners and settings, ensure device access, and monitor use.',
    [
      'Keep all help-request practice paired with the familiar aide so the student avoids communication errors.',
      'Teach a completely distinct request phrase for each classroom and adult to expand communication variety.',
      'Conclude that silence with unfamiliar staff reflects low motivation rather than a generalization gap.',
    ],
    'Generalization requires planned variation, reliable communication access, and consistent natural consequences. Data across partners help identify whether the learner needs additional exemplars or whether adults are responding inconsistently.',
    [
      'Restricting practice to one aide locks the request to a single familiar person instead of programming transfer to new staff and settings.',
      'Teaching incompatible phrases for every room increases memory load and undermines a consistent, portable self-advocacy skill.',
      'Blaming low motivation overlooks a classic stimulus-generalization need and ignores whether new staff recognize and honor the student’s mode.',
    ]
  ),
  q(
    'A writing goal is scored as complete whenever a student copies a five-sentence paragraph after a model. What would be a more meaningful measure?',
    'Staff report a finished written product but cannot tell which parts the student generated independently. How should progress be measured?',
    'Track defined writing components—topic choice, idea generation, arrangement, revision—alongside prompt levels.',
    [
      'Count every neatly copied sentence from the board as evidence of independent written composition.',
      'Evaluate writing growth primarily by visual neatness, spacing, and formatting of the finished page.',
      'Document how many minutes staff spent assisting with the draft instead of recording student responses.',
    ],
    'Component and prompt-level data separate authorship from copying or adult completion. The information shows which writing processes are developing and where access or explicit instruction should be adjusted.',
    [
      'Scoring copied text as independent composition masks lack of authorship and gives misleading progress reports to families and the IEP team.',
      'Visual neatness reflects handwriting or layout appearance rather than meaningful idea generation, organization, and independent expression.',
      'Logging adult effort measures staff workload rather than the student’s actual composing skills and decreasing prompt dependence.',
    ]
  ),
];

const functionalMathematics = [
  q(
    'A student is planning a purchase with a fixed budget and can use a calculator but needs help deciding which items fit. What should instruction emphasize?',
    'During a school-store activity, a learner can enter numbers but does not yet use totals to make a choice. Which lesson is most appropriate?',
    'Model a budget comparison strategy with a calculator or visual guide, practice choices, and fade prompts.',
    [
      'Take away the calculator and require mental paper-and-pencil addition before allowing school-store purchases.',
      'Have a staff member pick out the items that fit the budget and read the final register total aloud.',
      'Assign isolated drills typing random prices into the calculator without connecting totals to buying choices.',
    ],
    'The instructional target is mathematical reasoning within a meaningful routine, not denial of an appropriate tool. Authentic comparison, accessible representation, and prompt fading build agency and generalizable budget use.',
    [
      'Removing an effective calculation tool adds an unnecessary computation barrier instead of teaching budget comparison and decision making.',
      'Having an adult choose items eliminates student agency and removes the practical mathematical reasoning the routine is meant to build.',
      'Entering unrelated prices without making a budget choice fails to teach how totals govern real purchasing decisions.',
    ]
  ),
  q(
    'A student reads digital times but misses activities when a schedule changes. Which mathematics instruction best addresses the need?',
    'A learner matches clock displays on worksheets yet cannot decide when to leave for the next location. What should the teacher do?',
    'Teach elapsed time and schedule checking in real daily routines across varied times, locations, and changes.',
    [
      'Continue matching printed digital clock flashcards at a desk until worksheet speed reaches mastery.',
      'Have a paraprofessional announce every room transition verbally without referencing clocks or schedules.',
      'Keep every daily schedule minute fixed permanently so the student never encounters a routine adjustment.',
    ],
    'Time use involves relating clock information to duration, sequence, and action. Varied practice in real routines plus accessible cues supports transfer and reduces dependence on adult transition commands.',
    [
      'Static clock-matching worksheets do not teach how to relate current time to upcoming transitions or respond when schedules shift.',
      'Relying on adult verbal commands builds prompt dependence instead of teaching functional time monitoring and self-directed transitions.',
      'Attempting to prevent all schedule changes is unrealistic in school and community life and misses the chance to teach flexible checking.',
    ]
  ),
  q(
    'A learner names coins accurately but cannot determine change during a café purchase. Which instructional sequence is strongest?',
    'Worksheet performance on money symbols has not transferred to checking a cash transaction. What should the educator add?',
    'Link concrete money models to visual supports and symbolic steps, then practice across authentic purchases.',
    [
      'Repeat oral coin-naming drills on tabletop mats without connecting values to actual café prices.',
      'Instruct the student to rely on the cashier’s count at every register rather than checking change.',
      'Begin with abstract written subtraction algorithms before using real coins, bills, or visual models.',
    ],
    'Concrete-representational-abstract instruction links money concepts to the actual decision the learner must make. Systematic modeling and varied transactions build accuracy without treating isolated naming as functional mastery.',
    [
      'Repeating coin naming reinforces a skill the learner already has while leaving transaction calculation and change checking untaught.',
      'Relying passively on cashiers sacrifices financial self-advocacy and leaves the student vulnerable to everyday money errors.',
      'Jumping straight to abstract algorithms without concrete and visual money anchors makes place-value and change concepts harder to grasp.',
    ]
  ),
  q(
    'A student is learning to measure ingredients during a culinary routine. What is the safest and most instructionally useful approach?',
    'A cooking task includes quantity selection, sequencing, and hot equipment. How should mathematics instruction be organized?',
    'Task-analyze the routine, teach measuring with adapted tools and visuals, follow safety plans, and fade prompts.',
    [
      'Provide continuous hand-over-hand physical guidance throughout the entire cooking lesson indefinitely.',
      'Have an adult measure and prepare every ingredient ahead of time so the student avoids kitchen risks.',
      'Teach cup measurement in isolation and transition immediately to unsupervised use of hot appliances.',
    ],
    'Task analysis can integrate mathematical quantity with safe participation. Accessible tools, explicit teaching, the existing safety plan, and prompt-fading data support both competence and autonomy without exceeding educator scope.',
    [
      'Indefinite hand-over-hand guidance prevents active learning, limits autonomy, and provides no data on emerging independent measurement skills.',
      'Pre-measuring every ingredient removes the core functional math task when adapted cups and visual cues support safe student participation.',
      'Allowing unsupervised hot-appliance use before verifying reliable safety mastery violates individualized health plans and classroom safety protocols.',
    ]
  ),
  q(
    'A student can count objects to ten but is participating in a grade-level unit comparing data displays. Which plan is most appropriate?',
    'Foundational number skills are emerging while classmates analyze a simple class survey. How should the teacher maintain access?',
    'Teach needed counting explicitly while giving an accessible, substantive role in building and reading shared data.',
    [
      'Substitute unrelated preschool counting worksheets while classmates collect and compare survey graphs.',
      'Wait until the student masters counting above one hundred before allowing any participation in data units.',
      'Assign the student to pass out pencils and folders while peers collect, graph, and interpret the survey.',
    ],
    'Foundational and grade-level instruction can occur together. An accessible role in the shared mathematical process preserves ambitious content, while explicit number teaching addresses the prerequisite needed for increasing independence.',
    [
      'Replacing the unit with preschool worksheets removes grade-level inclusion and dignity when adapted survey roles reinforce counting naturally.',
      'Waiting for full mastery of large numbers delays exposure to meaningful grade-level data reasoning that can be accessed with supports now.',
      'Assigning clerical supply tasks excludes the student from authentic mathematical thinking and misuses inclusive general education class time.',
    ]
  ),
  q(
    'A learner completes a sorting-and-counting routine only after an adult immediately points to each next step. Which change best reduces prompt dependence?',
    'Correct answers occur under continuous verbal cues rather than the visual math strategy. What should the educator do?',
    'Use planned time delay and least-to-more prompting, reinforce independent checks, and track prompt levels.',
    [
      'Keep immediate adult pointing active during every math trial because accurate final answers are sufficient.',
      'Withdraw all visual and verbal cues abruptly on Monday and record any pause as behavioral task refusal.',
      'Have the classroom adult finish the remaining sorting steps whenever the student pauses between items.',
    ],
    'Planned delay and prompt fading transfer control to the task materials and self-check routine. Recording both accuracy and support level distinguishes independent mathematical use from adult-directed completion.',
    [
      'Maintaining immediate cues keeps the learner dependent on adult prompts rather than transferring control to the visual math strategy.',
      'Abruptly removing all supports and labeling hesitation as refusal punishes a fading transition instead of teaching independence systematically.',
      'Completing the sorting task for the learner eliminates vital practice opportunities and reinforces passively waiting for adult rescue.',
    ]
  ),
  q(
    'A student calculates a lunch total in the classroom but not at a community café or school event. What should the next instructional phase include?',
    'A price-comparison strategy appears only with one menu and one teacher. How can the team program generalization?',
    'Practice the core strategy across varied menus, prices, partners, and settings while keeping access tools ready.',
    [
      'Repeat the identical classroom lunch menu worksheet until calculation speed becomes completely effortless.',
      'Teach a separate, unique calculation method for every café or school event the student might visit.',
      'Remove the student’s calculator whenever leaving the classroom so community settings test mental recall.',
    ],
    'Generalization requires planned variation around the invariant mathematical strategy. Consistent access tools and probes across contexts show whether the learner can select and use the procedure beyond the original lesson.',
    [
      'Over-drilling one familiar classroom menu does not teach the student to handle novel layouts, prices, and distractions in real cafés.',
      'Inventing different procedures for each location adds unnecessary cognitive load instead of reinforcing one flexible, generalizable strategy.',
      'Removing an established access tool in the community introduces an artificial barrier right when real-world transfer is being practiced.',
    ]
  ),
  q(
    'A program reports 90 percent accuracy in a shopping routine, but adults frequently correct choices before the student responds. What data would support a valid decision?',
    'A team wants to know whether functional mathematics instruction is producing independence. Which measurement plan is strongest?',
    'Measure accuracy, completion, prompt level, generalization across routines, and implementation fidelity repeatedly.',
    [
      'Rely on overall percent accuracy scores alone even when adults prompt or redirect most shopping choices.',
      'Evaluate instructional effectiveness from a single successful community outing observed by the teacher.',
      'Count adult-corrected shopping selections as independent student responses on the quarterly IEP report.',
    ],
    'Multiple direct measures separate mathematical accuracy from prompt dependence and implementation differences. Repeated generalization and fidelity evidence help the team decide whether to fade, intensify, or revise instruction.',
    [
      'Unqualified accuracy scores hide heavy adult prompting and prevent the team from seeing whether true independence is growing.',
      'One isolated outing lacks longitudinal reliability and cannot show consistent transfer across settings, staff, or budget scenarios.',
      'Counting adult-corrected shopping selections as independent student responses misrepresents true present levels and skews ongoing IEP progress decisions.',
    ]
  ),
];

module.exports = { functionalLiteracy, writingCommunication, functionalMathematics };
