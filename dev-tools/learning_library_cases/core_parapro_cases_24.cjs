'use strict';

const PRAXIS_CORE_5752_LABELS = {
  schemaVersion: 1,
  label: 'Applied exam-reasoning case',
  presentationLabel: 'Task scenario',
  answerLabel: 'Best analytical move',
  explanationLabel: 'Step-by-step rationale'
};

const PARAPRO_LABELS = {
  schemaVersion: 1,
  label: 'Applied instructional-support case',
  presentationLabel: 'Classroom scenario',
  answerLabel: 'Best paraprofessional support',
  explanationLabel: 'Instructional rationale'
};

const praxis_core_5752 = {
  'core5752-ch-01-section-04': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Preserving Scope and Qualifications in a Reading Passage Summary',
    clinicalDescription:
      'A Praxis Core Reading passage reports that during a two-year pilot in three suburban districts, later middle school start times were associated with higher morning attendance and modest gains in student-reported alertness, though bus-routing costs rose and rural districts were not studied. Four summary choices compete for the best synthesis.',
    diagnosis:
      'Select the summary noting later start times correlated with higher attendance and alertness in a suburban pilot alongside higher transit costs.',
    explanation:
      'Accurate summaries preserve sample boundaries, hedged correlation, and key trade-offs from the passage. A tempting distractor claiming later start times prove nationwide achievement gains drops the author qualifications, omits cost limits, and turns an observed association into an unsupported universal causal claim.'
  },
  'core5752-ch-02-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Resolving Contextual Meaning Through Contrast Clues and Tone',
    clinicalDescription:
      'In a Reading passage on municipal water recycling, the author writes: "Early critics dismissed the purification plant as a risky experiment, yet five drought-free summers have largely vindicated the engineers and their design." A vocabulary-in-context question asks for the closest meaning of "vindicated" among "excused," "justified," "celebrated," and "replaced."',
    diagnosis:
      'Substitute each option into the contrast clause and select "justified" because real-world drought reliability confirmed the criticized design was sound.',
    explanation:
      'The transition "yet" contrasts initial skepticism with five summers of concrete evidence, signaling that performance proved the design defensible rather than merely forgiven. Choosing "excused" misses the connotation of evidentiary proof, while "celebrated" exaggerates the measured, analytical tone of the passage.'
  },
  'core5752-ch-03-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Separating Absolute and Relative Change on a Truncated Bar Graph',
    clinicalDescription:
      'A Praxis Core bar graph tracks library e-book checkouts from 2021 to 2024: Branch A grew from 200 to 300 checkouts, while Branch B grew from 2,000 to 2,500 checkouts. Because the vertical axis starts at 100 instead of 0, Branch A looks sharply steeper. An item asks which branch posted the larger absolute gain and which posted the larger relative gain.',
    diagnosis:
      'Read axis values before comparing bars: Branch B gained more overall (500 versus 100), while Branch A posted the larger relative gain (50% versus 25%).',
    explanation:
      'Computing raw differences (300 minus 200 = 100; 2,500 minus 2,000 = 500) and percent gains (100/200 = 50%; 500/2,000 = 25%) prevents a truncated vertical scale from distorting the data. Treating the steepest visual jump as the largest total gain confuses percentage growth with raw volume.'
  },
  'core5752-ch-04-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Repairing a Misleading Paragraph Transition During Passage Revision',
    clinicalDescription:
      'In a Praxis Core Writing revision passage advocating neighborhood repair cafes, Paragraph 2 documents how fixing household appliances cuts landfill waste, while Paragraph 3 begins: "Therefore, many residents lack basic soldering tools and hesitate to open broken electronics." An item asks for the most effective revision to that opening transition.',
    diagnosis:
      'Replace "Therefore" with a contrastive transition like "However" or "Yet" to signal the shift from environmental benefits to practical barriers.',
    explanation:
      'Revision in context checks how adjacent paragraphs actually relate before editing local wording. Keeping "Therefore" imposes a false causal link suggesting waste reduction makes residents lose tools, whereas a contrastive marker accurately prepares readers for an obstacle that the essay must address next.'
  },
  'core5752-ch-05-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Fixing a Dangling Modifier, Parallelism Break, and Tense Shift',
    clinicalDescription:
      'A Writing language item presents this draft sentence: "After reviewing the lab notebook for two hours, the missing temperature readings were finally noticed by Elena, who recorded the data, checked the sensor, and was updating the chart." Candidates must select the revision that obeys standard written English without altering the past-time meaning.',
    diagnosis:
      'Place "Elena" right after the introductory modifier and match all three past verbs in parallel form: "recorded, checked, and updated."',
    explanation:
      'An introductory participial phrase must name the doer immediately after the comma; otherwise the sentence implies the temperature readings reviewed the notebook. Matching "recorded," "checked," and "updated" in simple past tense also eliminates the distracting shift to progressive aspect and restores clean parallel structure.'
  },
  'core5752-ch-06-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Eliminating Patchwriting and Restoring Accurate Source Attribution',
    clinicalDescription:
      'While drafting a source-based essay on urban heat islands, a writer takes a study sentence ("Reflective rooftops lowered peak afternoon surface temperatures by up to 18 degrees in dense blocks") and replaces only three words ("decreased," "highest," and "crowded") while omitting quotation marks and any in-text citation. An item asks how to correct the draft.',
    diagnosis:
      'Paraphrase the finding in fully original syntax with an in-text citation, or keep the exact wording inside quotation marks with attribution.',
    explanation:
      'Swapping a few synonyms while mirroring the original sentence structure is patchwriting and violates provenance rules even when a reference list appears later. Proper academic synthesis either quotes distinctive wording verbatim or paraphrases independently while crediting the non-common-knowledge finding to its study.'
  },
  'core5752-ch-07-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Applying Prime Factorization to Separate GCF and LCM Problems',
    clinicalDescription:
      'A Praxis Core Math task asks two connected scheduling questions: first, what is the greatest number of identical supply kits a teacher can pack using all 48 notebooks and 72 folders with none left over; second, if two science station timers beep every 12 minutes and 18 minutes starting at 8:00 AM, when will both beep together again?',
    diagnosis:
      'Use prime factorizations to get GCF(48, 72) = 24 identical kits (2 notebooks and 3 folders each) and LCM(12, 18) = 36 minutes, so both timers align at 8:36 AM.',
    explanation:
      'Factoring 48 = 2^4 x 3 and 72 = 2^3 x 3^2 yields the greatest shared product 2^3 x 3 = 24 kits, whereas factoring 12 = 2^2 x 3 and 18 = 2 x 3^2 yields the smallest common multiple 2^2 x 3^2 = 36 minutes. Stopping at a partial factor like 12 or confusing GCF with LCM produces non-maximal kits or missed synchronization times.'
  },
  'core5752-ch-08-section-04': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Squaring Scale Factors and Converting Square Feet to Square Yards',
    clinicalDescription:
      'On a Praxis Core architectural drawing using a scale of 1 inch to 6 feet, a rectangular courtyard measures 3 inches by 4.5 inches (13.5 square inches on paper). A landscape bid requires the actual courtyard area in square yards, where 1 yard equals 3 feet. One tempting option multiplies 13.5 by 6 and divides by 3.',
    diagnosis:
      'Scale each linear side first to 18 feet by 27 feet (or 6 yards by 9 yards) before multiplying, giving 486 square feet and an exact area of 54 square yards.',
    explanation:
      'Because area is two-dimensional, it scales by the square of the linear factor (13.5 times 36 = 486 square feet) and converts by 9 square feet per square yard (486 divided by 9 = 54 square yards). Multiplying paper area by 6 or dividing square feet by 3 mistakenly applies one-dimensional linear factors to area.'
  },
  'core5752-ch-09-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Comparing Two Quiz Distributions Sharing an Identical Mean',
    clinicalDescription:
      'Two sections of 7 students take the same 100-point quiz. Section A earns 76, 78, 79, 80, 81, 82, and 84. Section B earns 40, 84, 85, 86, 87, 88, and 90. Both sections have an exact mean of 80 (total 560 divided by 7), and a Praxis Core Data item asks which conclusion best compares their performance and spread.',
    diagnosis:
      'State that Section B has a higher median (86 versus 80) and far greater spread (range 50 versus 8) because one low outlier of 40 pulls its mean down to 80.',
    explanation:
      'Evaluating center, variability, and outliers together reveals that identical means can mask contrasting distributions: six of seven students in Section B scored at least 84, whereas Section A clustered tightly around 80. Claiming both classes performed identically relies on the mean alone and ignores skewness and spread.'
  },
  'core5752-ch-10-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Evaluating Margin of Error Claims in a Statewide Teacher Poll',
    clinicalDescription:
      'A random statewide survey of 1,000 teachers finds 52% favor a balanced school calendar, with a 95% confidence margin of error of plus or minus 3 percentage points. A commentary headline claims "a clear majority of teachers support the calendar" and states that 95% of individual teachers fall between 49% and 55% approval.',
    diagnosis:
      'Note that the 49% to 55% interval dips under 50%, so no majority is proven, and explain it estimates the population proportion, not individuals.',
    explanation:
      'Adding and subtracting the 3-point margin of error yields 49% to 55%; because values under 50% remain plausible under sampling uncertainty, the poll cannot guarantee majority support. Treating 52% as conclusive ignores sampling error, and applying the interval to individual teachers misinterprets what confidence intervals estimate.'
  },
  'core5752-ch-11-section-04': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Interpreting Slope and Intercept in a Linear Print-Cost Model',
    clinicalDescription:
      'A school print shop charges a fixed setup fee plus a constant cost per booklet. Ordering 50 booklets costs 165 dollars, and ordering 120 booklets costs 340 dollars. A Praxis Core Algebra item asks for the linear cost equation and the real-world meaning of its slope and vertical intercept.',
    diagnosis:
      'Find slope (340 minus 165) / (120 minus 50) = 2.50 dollars per booklet and y-intercept 40 dollars, giving C = 2.50x + 40 with a 40-dollar setup fee.',
    explanation:
      'Slope tracks output change per unit input (175 dollars over 70 booklets = 2.50 dollars per booklet), and substituting (50, 165) into 165 = 2.50(50) + b gives b = 40 dollars, which makes sense here as the zero-booklet setup charge. Inverting the ratio (70/175) or treating 165 as the y-intercept confuses a plotted point with the intercept.'
  },
  'core5752-ch-12-section-03': {
    ...PRAXIS_CORE_5752_LABELS,
    title: 'Distinguishing Open-Top Surface Area from Soil Capacity Volume',
    clinicalDescription:
      'A rectangular open-top wooden planter box has interior and exterior dimensions treated as 4 feet long, 2 feet wide, and 1.5 feet high. A Praxis Core Geometry item asks for both the exterior area to paint across all four sides plus the bottom (excluding the open top) and the volume of soil required to fill the box completely.',
    diagnosis:
      'Sum only the five exposed faces for open-top surface area (8 + 12 + 6 = 26 square feet) and multiply dimensions for soil volume (12 cubic feet).',
    explanation:
      'Sketching the five painted faces sums the bottom (4 x 2 = 8), two long sides (2 x 4 x 1.5 = 12), and two short sides (2 x 2 x 1.5 = 6) for 26 square feet, while 4 x 2 x 1.5 = 12 cubic feet measures interior capacity. Applying the closed-box formula mistakenly adds an 8-square-foot lid (giving 34), and mixing square with cubic units conflates covering with filling.'
  }
};

const parapro = {
  'parapro-ch-01-section-3': {
    ...PARAPRO_LABELS,
    title: 'Guiding a Complete Paraphrased Summary Without Rewriting It',
    clinicalDescription:
      'During a teacher-planned fifth-grade reading group, a student summarizes a three-paragraph article on monarch migration by copying one vivid sentence about orange wings from paragraph 1 and adding, "I think butterflies are cool," while leaving out winter habitats and milkweed loss covered in paragraphs 2 and 3.',
    diagnosis:
      'Guide the student to jot one key idea per paragraph on a graphic organizer and combine those points in original wording without personal reactions.',
    explanation:
      'Checking every paragraph ensures the summary captures essential ideas across the whole text while excluding decorative details and personal opinions. Writing the summary for the student removes independent practice, and praising the copied sentence rewards verbatim lifting over balanced comprehension.'
  },
  'parapro-ch-02-section-3': {
    ...PARAPRO_LABELS,
    title: 'Coaching Context Clues and Word Parts Instead of Giving Definitions',
    clinicalDescription:
      'While supporting a fourth-grade science reading group assigned by the teacher, a student stops at "biodegradable" in the sentence: "Unlike plastic bottles that last for centuries, biodegradable wrappers break down naturally in soil." The student skips the word and asks the paraprofessional to simply say what it means.',
    diagnosis:
      'Prompt the student to use the contrast cue "Unlike plastic" and word parts ("bio-" and "degrade"), then test the meaning back in the sentence.',
    explanation:
      'Pairing contrast clues with morpheme analysis builds transferable word-solving strategies and confirms that the proposed meaning fits the full sentence. Immediately supplying the definition fosters prompt dependence, while guessing from word parts without checking context can misread technical or figurative usage.'
  },
  'parapro-ch-03-section-3': {
    ...PARAPRO_LABELS,
    title: 'Helping Students Compare a Primary Diary and a Secondary Textbook',
    clinicalDescription:
      'At a sixth-grade social studies station designed by the teacher, two students compare a 1906 earthquake survivor diary entry with a 2022 textbook summary. One student insists the textbook is "wrong" because it leaves out the survivor dog and reports citywide rebuilding figures that the diary never mentions.',
    diagnosis:
      'Have students log shared facts first, distinguish the primary diary from the secondary textbook, and note how purpose shapes detail selection.',
    explanation:
      'Distinguishing factual contradiction from differences in scope, audience, and source type helps students see why primary accounts provide personal immediacy while secondary texts synthesize broader patterns. Calling either source inaccurate or skipping evidence comparison misses the core skill of evaluating viewpoints.'
  },
  'parapro-ch-04-section-4': {
    ...PARAPRO_LABELS,
    title: 'Fading Reading Prompts and Sharing Mastery Data With the Teacher',
    clinicalDescription:
      'After three weeks of teacher-directed fluency practice, a third grader who once needed finger-tracking cues and rapid word prompts now decodes 96% of passage words accurately and self-corrects errors when given three seconds of wait time. The paraprofessional still taps each line and praises "fast reading."',
    diagnosis:
      'Fade line-tapping prompts, praise accurate self-correction and phrasing rather than speed, and share the mastery trend with the teacher.',
    explanation:
      'Effective instructional support ties feedback to observable behaviors, fades scaffolds as data demonstrate growing independence, and keeps the licensed teacher informed for grouping or goal updates. Maintaining unnecessary prompts sustains dependence, and praising speed encourages rushed word-calling over comprehension.'
  },
  'parapro-ch-05-section-3': {
    ...PARAPRO_LABELS,
    title: 'Correcting Discount Subtraction and Percent-Change Base Errors',
    clinicalDescription:
      'In a teacher-assigned seventh-grade math station, a student finds the sale price of a 40-dollar backpack marked 25% off by computing 40 minus 25 = 15 dollars. On the next item, finding the percent increase when a 20-dollar game rises to 25 dollars, the student divides 5 by 25 instead of the original 20.',
    diagnosis:
      'Model PART = RATE x WHOLE (0.25 x 40 = 10 dollars off, leaving 30 dollars) and divide the 5-dollar increase by the original 20 dollars (25%).',
    explanation:
      'Reinforcing percent as parts per hundred stops students from treating 25% as 25 flat dollars, while anchoring percent change to the original amount keeps the denominator accurate. Simply giving the student 30 dollars and 25% finishes one worksheet without repairing either conceptual misconception.'
  },
  'parapro-ch-06-section-3': {
    ...PARAPRO_LABELS,
    title: 'Using Balance Models and Substitution Checks for Linear Equations',
    clinicalDescription:
      'During a sixth-grade algebra practice group, a student solves 3x + 7 = 22 by adding 7 to 22 to get 3x = 29, saying "you just move the 7 to the other side," and never substitutes the answer back into the original equation to check whether both sides stay equal.',
    diagnosis:
      'Use a balance visual to apply inverse operations to both sides (subtract 7, divide by 3 to get x = 5) and have the student check 3(5) + 7 = 22.',
    explanation:
      'Treating an equation as a balanced scale shows why subtracting 7 from both sides preserves equality, and substituting x = 5 back into the original statement builds independent error checking. Relying on "move it over" tricks invites sign mistakes, and fixing the steps for the student prevents mastery.'
  },
  'parapro-ch-07-section-3': {
    ...PARAPRO_LABELS,
    title: 'Scaffolding Straight-Angle Sums and Ordered-Pair Coordinate Plots',
    clinicalDescription:
      'At a fifth-grade geometry table led under the teacher plan, a student finds the angle adjacent to 65 degrees on a straight line by subtracting from 90 degrees (getting 25 degrees). On the next coordinate grid item, the student plots (3, 5) by moving up 3 and right 5, then guesses the distance from (3, 5) to (3, 9).',
    diagnosis:
      'Review straight angles equal 180 degrees (180 minus 65 = 115), cue horizontal x before vertical y to plot (3, 5), and find |9 minus 5| = 4 units.',
    explanation:
      'Anchoring angle calculations to visual benchmarks (180 degrees for a straight line versus 90 for a right angle) and cueing (x, y) axis order builds dependable spatial accuracy. Allowing the student to eyeball lengths or erasing their plot without naming the x-first rule leaves both habits uncorrected.'
  },
  'parapro-ch-08-section-3': {
    ...PARAPRO_LABELS,
    title: 'Addressing the Gambler Fallacy in a Hands-On Coin Probability Lab',
    clinicalDescription:
      'During a teacher-planned probability lab, a small group flips a fair coin 8 times and tallies 6 heads and 2 tails (75% heads). One student argues the coin is "broken" and writes that the 9th flip must land on tails to "even out" the results before finishing the reflection sheet.',
    diagnosis:
      'Contrast small-sample experimental results (6/8) with theoretical probability (1/2), review independent flips, and pool class trials to show stability.',
    explanation:
      'Comparing a short run of 8 trials against combined class data shows students that small samples vary widely while each independent fair flip stays 50/50 and larger samples approach 1/2. Agreeing that tails is "due" reinforces the gambler fallacy, and abandoning the activity wastes rich empirical evidence.'
  },
  'parapro-ch-09-section-3': {
    ...PARAPRO_LABELS,
    title: 'Using Targeted Questions to Coach Modifier, Usage, and Parallel Edits',
    clinicalDescription:
      'While coaching seventh-grade draft revisions under the teacher rubric, a paraprofessional reads: "Walking to the bus stop, my backpack strap snapped, and their were notebooks spilling everywhere while I ran, tripped, and was dropping my folder." The student asks why the sentence sounds awkward.',
    diagnosis:
      'Ask who was walking so the student puts "I" after the comma, cue "there" for existence, and align past verbs ("ran, tripped, and dropped").',
    explanation:
      'Focused questioning helps the writer spot the dangling modifier, distinguish "their" from "there," and align parallel past-tense verbs while retaining ownership of the revision. Rewriting the sentence directly on the student paper corrects surface mechanics without teaching self-editing strategies.'
  },
  'parapro-ch-10-section-3': {
    ...PARAPRO_LABELS,
    title: 'Coaching Logical Transitions and Consistent Verb Tense in Revision',
    clinicalDescription:
      'In an eighth-grade writing station, a student narrative shifts mid-sentence from past to present ("Maya opened the gate and sees the stray dog") and connects two contrasting ideas with "Therefore": "The rain soaked the field. Therefore, the players finished the match with high energy."',
    diagnosis:
      'Have the student mark one past timeline ("opened" and "saw") and identify the contrast link before choosing "However" or "Nevertheless."',
    explanation:
      'Identifying the relationship between ideas before selecting a transition prevents misleading cause-and-effect cues, and tracking one narrative timeline keeps verb tense coherent. Picking connectors randomly from a word bank or silently correcting verbs for the student blocks independent revision judgment.'
  },
  'parapro-ch-11-section-3': {
    ...PARAPRO_LABELS,
    title: 'Teaching Genuine Paraphrasing and Attribution During Student Research',
    clinicalDescription:
      'Supporting a teacher-assigned sixth-grade research group on school gardens, a paraprofessional notices a student copied two sentences from a university extension webpage, swapped only two adjectives, omitted quotation marks, and left out the source name while insisting, "I wrote it in my own words."',
    diagnosis:
      'Model closing the source to restate ideas freshly with attribution, or quote exact text with marks and citation, and inform the teacher.',
    explanation:
      'Showing how to paraphrase from comprehension rather than close word-swapping teaches ethical source use and clarifies that both quotes and paraphrases need attribution. Letting light synonym edits pass cements poor research habits, while accusing the student of misconduct exceeds supportive paraprofessional coaching.'
  },
  'parapro-ch-12-section-4': {
    ...PARAPRO_LABELS,
    title: 'Supporting Audience-Aware Writing and Documented 504 Accommodations',
    clinicalDescription:
      'During a teacher-designed fifth-grade task to write a recycling guide for first graders, one student with a 504 plan for written expression freezes at a blank page, while a peer drafts a dense paragraph packed with unexplained acronyms like "MRF" and adult-level policy jargon.',
    diagnosis:
      'Provide the 504-approved organizer and speech-to-text for independent drafting, and coach the peer to use plain language and clear headings.',
    explanation:
      'Implementing documented accommodations removes transcription barriers while maintaining grade-level writing expectations, and adapting vocabulary and structure to first graders builds genuine audience awareness. Drafting sentences for the stalled student removes ownership, and overlooking jargon leaves the guide inaccessible.'
  }
};

module.exports = {
  praxis_core_5752,
  parapro
};
