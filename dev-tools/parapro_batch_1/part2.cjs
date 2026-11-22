'use strict';

// Balanced-choice, prompt-length, and authored distractor-feedback overrides
// for ParaPro Batch 1 items 51-100 (math-app 001-010, writing 001-020, writing-app 001-010,
// plus the 10 Batch 1 supplement items).
module.exports = {
  'parapro-mathematics-application-001': {
    distractorNotes: [
      'Three-fifths equals 0.60, which is slightly shorter than two-thirds (about 0.667) and will not line up evenly on fraction strips.',
      'Three-sixths simplifies directly to one-half (0.50), making it shorter than two-thirds when placed side by side on fraction strips.',
      'Five-sixths equals about 0.833, which extends one-sixth past two-thirds (4/6) rather than matching it as an equivalent fraction.',
    ],
  },
  'parapro-mathematics-application-002': {
    choices: [
      'Model regrouping across zero, then check that 215 plus 187 equals 402.',
      'Have the student flip column digits and keep 385 since each column stays positive.',
      'Ask the student to add 402 and 187 together instead of solving subtraction.',
      'Swap the exercise for a problem without zeros and skip regrouping practice.',
    ],
    distractorNotes: [
      'Subtraction is not commutative column by column, so taking the smaller digit from the larger digit produces the wrong difference 385.',
      'Switching to adding 402 + 187 sidesteps subtraction completely and does not teach how to regroup across zero or check a difference.',
      'Replacing the problem with a zero-free subtraction exercise leaves the student’s core regrouping misconception unaddressed for future tasks.',
    ],
  },
  'parapro-mathematics-application-003': {
    distractorNotes: [
      'Adding 4 + 6 = 10 sums the row count and column count once rather than counting all 24 counters arranged in the array.',
      'Subtracting 6 − 4 = 2 finds the difference between row size and row count instead of modeling four equal groups of six.',
      'Although 24 and 6 belong to the same multiplication fact family, 24 ÷ 6 equals 4 rather than the false quotient 3.',
    ],
  },
  'parapro-mathematics-application-004': {
    distractorNotes: [
      'Converting 3/4 to 6/8 shows that 6/8 and 5/8 differ by one-eighth, so the two fractions do not occupy the same point.',
      'Because 6/8 sits one-eighth to the right of 5/8 on the number line, claiming 3/4 < 5/8 reverses their actual order.',
      'Any two fractions can be compared accurately by renaming them with a common denominator or locating both on a shared number line.',
    ],
  },
  'parapro-mathematics-application-005': {
    distractorNotes: [
      'Twenty-eight feet calculates the perimeter around the rug’s outer edges (8 + 6 + 8 + 6) rather than the square feet of floor covered.',
      'Fourteen adds the rug’s length and width once (8 + 6) instead of multiplying 8 × 6 to find interior rectangular area.',
      'Ninety-six doubles the actual rectangular area (2 × 48) rather than computing length times width once for the 8-by-6 rug.',
    ],
  },
  'parapro-mathematics-application-006': {
    choices: [
      'A single plotted point placed along one horizontal number line',
      'A bar graph displaying one labeled bar per fruit',
      'A classroom wall clock showing hours and minute marks',
      'A blank coordinate grid containing no axis labels at all',
    ],
    distractorNotes: [
      'A single point on a number line represents only one numerical value and cannot compare four distinct categorical fruit totals side by side.',
      'A clock face tracks elapsed hours and minutes rather than displaying categorical survey frequencies across apples, bananas, grapes, and oranges.',
      'An unlabeled coordinate grid gives readers no way to identify which categories or vote counts correspond to each plotted mark.',
    ],
  },
  'parapro-mathematics-application-007': {
    distractorNotes: [
      'Nine is the arithmetic mean of the dataset (45 ÷ 5 = 9) rather than the middle value (median) in the ordered list.',
      'Ten sits fourth out of five ordered values, placing it above the center position (third value, 8) that defines the median.',
      'Forty-five is the combined sum of all five page counts rather than a measure of center showing the middle student’s pages.',
    ],
  },
  'parapro-mathematics-application-008': {
    distractorNotes: [
      'Writing 5 + x + 3 = 43 adds the number of packs to the cards per pack instead of multiplying 5 packs by x cards.',
      'Writing 5x − 3 = 43 subtracts the 3 loose cards rather than adding them to the 5 full packs to reach 43 total cards.',
      'Writing 3x + 5 = 43 swaps the roles of the 5 packs and 3 loose cards, modeling 3 packs of x plus 5 loose cards instead.',
    ],
  },
  'parapro-mathematics-application-009': {
    distractorNotes: [
      'Knowing that a product must be positive checks only the sign and never reveals whether a decimal place-value error inflated the size.',
      'Rounding factors produces a helpful benchmark estimate for checking magnitude rather than yielding the exact decimal product.',
      'Dropping decimal points changes 19.8 × 5.1 into 198 × 51, which inflates the product by 100 unless two decimal places are restored.',
    ],
  },
  'parapro-mathematics-application-010': {
    distractorNotes: [
      'Two hundred fifty milliliters equals only 0.25 liter (one-quarter liter), reflecting a decimal shift error of one factor of ten.',
      'Twenty-five milliliters equals just 0.025 liter, dividing instead of multiplying 2.5 liters by 1,000 milliliters per liter.',
      'Twenty-five thousand milliliters equals 25 full liters rather than 2.5 liters, overshooting the required volume by ten times.',
    ],
  },
  'parapro-writing-skills-001': {
    distractorNotes: [
      'The simple subject "basket" is singular (not the prepositional object "supplies"), so it requires the singular verb "is" instead of "are."',
      'The simple subject "students" is plural (not the prepositional object "club"), so it requires the plural verb "practice" instead of "practices."',
      'The indefinite pronoun "each" is grammatically singular, so it requires the singular verb "has" rather than the plural form "have."',
    ],
  },
  'parapro-writing-skills-002': {
    choices: [
      'Mr. Lee gave hall passes to Ana and me.',
      'Her and Jamal finished setting up the display.',
      'The track coach spoke briefly with Luis and I.',
      'Me and Tori will carry both supply boxes inside.',
    ],
    distractorNotes: [
      'Because the pronoun serves inside a compound subject, it requires the nominative form "She and Jamal" rather than objective "Her."',
      'As part of the compound object of the preposition "with," the pronoun requires the objective case "me" rather than "I."',
      'In subject position before the verb "will carry," standard English requires the nominative form "Tori and I" rather than "Me."',
    ],
  },
  'parapro-writing-skills-003': {
    distractorNotes: [
      'Leaving "Walking through the hallway" next to "the new bulletin board" still illogically suggests that the bulletin board itself was walking.',
      'Inserting "walking through the hallway" directly after "bulletin board" explicitly assigns the walking action to the inanimate board.',
      'Saying "Sam’s attention was new while walking" alters the intended meaning and still fails to attach the walking action clearly to Sam.',
    ],
  },
  'parapro-writing-skills-004': {
    distractorNotes: [
      'Pairing present-tense "measure" with past-tense "recorded" creates an unnecessary tense shift inside a sentence set "Yesterday."',
      'Pairing past-tense "measured" with present-tense "record" shifts tenses mid-sentence even though both actions took place yesterday.',
      'Using future-tense "will measure" contradicts the past time marker "Yesterday" and clashes with the past-tense verb "recorded."',
    ],
  },
  'parapro-writing-skills-005': {
    distractorNotes: [
      'Possessive "Their" cannot replace the contraction "They’re" (they are), and "they’re" cannot act as a possessive before "books."',
      'Location word "There" cannot serve as the contraction "They’re" (they are), and "they’re" does not indicate a physical place.',
      'This version reverses the final two homophones, placing location "there" before "books" and possessive "their" after "over."',
    ],
  },
  'parapro-writing-skills-006': {
    choices: [
      'Finish the first math problem than check your answer against the key.',
      'The heavy blue classroom folder is noticeably thicker then the red one.',
      'Solve step one, then check if the answer is greater than 10.',
      'The fourth-grade class lined up quietly than walked down to lunch.',
    ],
    distractorNotes: [
      'Showing the next step in a sequence requires the time adverb "then" rather than the comparative conjunction "than."',
      'Comparing the thickness of two folders requires the comparative word "than" rather than the time sequence word "then."',
      'Connecting one sequential classroom action to the next ("lined up" followed by "walked") calls for "then" instead of "than."',
    ],
  },
  'parapro-writing-skills-007': {
    distractorNotes: [
      'Placing the apostrophe before the s ("teacher’s") forms a singular possessive referring to only one teacher instead of two.',
      'Omitting the apostrophe ("teachers plans") leaves a bare plural noun without marking ownership over the lesson plans.',
      'Adding an extra s after the apostrophe ("teachers’s") breaks standard punctuation for regular plural nouns ending in s.',
    ],
  },
  'parapro-writing-skills-008': {
    distractorNotes: [
      'Placing a comma between "bell" and "rang" splits the introductory clause’s subject from its verb and misses the clause boundary.',
      'Putting the comma after "students" breaks the main subject away from its verb "opened" instead of marking the introductory clause.',
      'Inserting a comma right after "After" interrupts the subordinating conjunction and fails to separate the introductory clause cleanly.',
    ],
  },
  'parapro-writing-skills-009': {
    distractorNotes: [
      'Joining two complete independent clauses with only a comma creates a comma splice rather than a properly punctuated sentence.',
      'Placing "because," between the clauses misuses subordination and inserts an unneeded comma that breaks grammatical flow.',
      'Placing "The rain stopped" and "the game resumed" together with no punctuation or conjunction creates a fused run-on sentence.',
    ],
  },
  'parapro-writing-skills-010': {
    distractorNotes: [
      'Standard American punctuation requires a comma after the dialogue tag "said" and places the closing period inside the quotation marks.',
      'Opening quotation marks before "the window" leaves "Please close" outside the spoken words even though Maya spoke the whole request.',
      'Although the closing period sits properly inside the quotation marks, a comma is still required after the dialogue tag "said."',
    ],
  },
  'parapro-writing-skills-011': {
    distractorNotes: [
      'The word "bright" is a descriptive adjective modifying the noun "kite" rather than the simple subject performing the action.',
      'The noun "trees" functions as the object inside the prepositional phrase "above the trees" rather than the sentence’s subject.',
      'The word "moved" is the past-tense action verb in the predicate telling what the kite did, not the simple subject.',
    ],
  },
  'parapro-writing-skills-012': {
    distractorNotes: [
      'The plural noun "students" serves as the grammatical subject performing the action rather than the action verb itself.',
      'The word "carefully" is an adverb modifying "tested" to tell how the students worked, not the sentence’s main verb.',
      'The noun "model" serves as the direct object receiving the action of testing rather than expressing the action itself.',
    ],
  },
  'parapro-writing-skills-013': {
    distractorNotes: [
      'The word "bridge" is the noun being described by "wooden" and serving as the subject, not an adjective.',
      'The word "crossed" is the past-tense action verb telling what the bridge did rather than an adjective describing a noun.',
      'The word "stream" is a noun serving as the direct object; "narrow" is the adjective modifying "stream."',
    ],
  },
  'parapro-writing-skills-014': {
    distractorNotes: [
      'The word "class" is a collective noun acting as the sentence’s subject rather than an adverb modifying a verb.',
      'The word "entered" is the past-tense action verb showing what the class did rather than an adverb describing how.',
      'The word "auditorium" is a place noun functioning as the direct object of "entered," rather than an adverb modifying the verb.',
    ],
  },
  'parapro-writing-skills-015': {
    distractorNotes: [
      'The word "backpack" is the singular noun acting as the sentence’s subject rather than a preposition showing spatial relationship.',
      'The word "rested" is the past-tense verb telling what the backpack did rather than a preposition introducing a phrase.',
      'The noun "desk" is the object of the preposition "beneath" inside the prepositional phrase rather than the preposition itself.',
    ],
  },
  'parapro-writing-skills-016': {
    prompt: 'During a classroom writing and editing review, which of the following words is spelled correctly?',
    distractorNotes: [
      'The misspelling "neccessary" incorrectly doubles the letter c when standard English spelling uses one c and two s letters.',
      'The misspelling "necesary" drops the second s, whereas the standard spelling "necessary" requires one c followed by double s.',
      'The misspelling "necessery" replaces the correct vowel a in the third syllable with an e instead of spelling "-sary."',
    ],
  },
  'parapro-writing-skills-017': {
    choices: [
      'The morning school bus arrived ten minutes late.',
      'Students waited patiently beneath the front awning.',
      'Because the school bus arrived ten minutes late.',
      'The bus driver apologized warmly to every passenger.',
    ],
    distractorNotes: [
      'This group contains a clear subject ("bus"), a finite verb ("arrived"), and a complete thought, forming a full sentence.',
      'This group pairs a subject ("Students") with a verb ("waited") to express a complete independent clause rather than a fragment.',
      'This group states a complete subject ("driver") and predicate ("apologized warmly to every passenger"), leaving no unfinished thought.',
    ],
  },
  'parapro-writing-skills-018': {
    distractorNotes: [
      'Inserting only a comma between the two complete independent clauses creates a comma splice error instead of joining them properly.',
      'When joining two independent clauses with a coordinating conjunction, the comma belongs before "and," not immediately after it.',
      'Placing a comma between "rehearsal" and "ended" splits subject from verb and leaves the two clauses fused as a run-on.',
    ],
  },
  'parapro-writing-skills-019': {
    distractorNotes: [
      'Days of the week ("Tuesday") and all major words in proper institution names ("Museum of Natural History") must be capitalized.',
      'Common nouns ("our art class") and short internal prepositions ("of") inside titles should remain lowercase rather than capitalized.',
      'The opening word of the sentence ("On") and the proper name "Museum of Natural History" both require capital letters.',
    ],
  },
  'parapro-writing-skills-020': {
    distractorNotes: [
      'Combining a gerund ("sketching"), an infinitive ("to paint"), and a plural noun ("sculptures") breaks parallel grammatical structure.',
      'Mixing two infinitives ("to sketch," "to sculpt") with one gerund ("painting") creates inconsistent verb forms across the series.',
      'Mixing a plural noun ("sketches"), an infinitive ("to paint"), and a gerund ("sculpting") leaves the three list items mismatched.',
    ],
  },
  'parapro-writing-application-001': {
    choices: [
      'Check every punctuation mark carefully before writing any draft sentences.',
      'Draft an outline grouping related details under main points.',
      'Write the closing conclusion paragraph before gathering topic evidence.',
      'Pick a decorative display font for the printed report cover page.',
    ],
    distractorNotes: [
      'Proofreading punctuation happens during final editing after sentences exist rather than during prewriting before drafting begins.',
      'Drafting a conclusion before researching or outlining reverses the writing process because conclusions synthesize developed report evidence.',
      'Selecting a decorative title-page font addresses visual formatting and does nothing to organize the student’s research ideas.',
    ],
  },
  'parapro-writing-application-002': {
    distractorNotes: [
      'An atlas is a collection of geographic maps and spatial data rather than a word reference for pronunciation or part of speech.',
      'An almanac compiles annual facts, weather tables, statistics, and calendars rather than defining word spellings and parts of speech.',
      'A thesaurus specializes in synonyms and related words and typically omits full pronunciation guides and comprehensive word entries.',
    ],
  },
  'parapro-writing-application-003': {
    choices: [
      'The school library holds printed books, desktop computers, tables, and quiet areas.',
      'Several middle-school students visit the library after afternoon classes have ended.',
      'This five-paragraph essay discusses possible changes to the school library schedule.',
      'Extending library hours would expand research, tutoring, and computer access.',
    ],
    distractorNotes: [
      'Listing library furniture and equipment states a neutral factual description without taking any arguable stance on extending hours.',
      'Noting that some students currently visit after school reports a simple observation without proposing what should change or why.',
      'Announcing "This essay discusses..." introduces the broad topic without asserting an arguable thesis claim or supporting reasons.',
    ],
  },
  'parapro-writing-application-004': {
    choices: [
      'School gardens often grow vegetables, flowers, herbs, and several beneficial insects.',
      'Our elementary building has three side doors opening toward the playground and garden.',
      'A school garden links science, math, and writing through hands-on work.',
      'Some students prefer planting carrots, while classmates choose tomatoes or green beans.',
    ],
    distractorNotes: [
      'Listing plants and insects found in gardens stays overly broad and never mentions how a garden supports learning across subjects.',
      'Describing hallway doors leading outside focuses on school architecture rather than connecting gardening to multi-subject classroom learning.',
      'Comparing favorite student vegetables narrows the paragraph to personal food tastes instead of focusing on cross-curricular classroom learning.',
    ],
  },
  'parapro-writing-application-005': {
    choices: [
      'A future science report could explore ocean habitats and seasonal whale migration patterns.',
      'The second paragraph explained solar panels, while the third paragraph described wind turbines.',
      'Solar and wind are both short words appearing several times across the body of this report.',
      'Local climate helps decide whether solar or wind power better cuts fossil-fuel use.',
    ],
    distractorNotes: [
      'Introducing ocean habitats and whale migration brings in an unrelated new topic instead of bringing the energy comparison to a close.',
      'Recapping which paragraph covered which topic mechanically points back at layout rather than synthesizing a meaningful conclusion.',
      'Commenting on word length and word count is a surface observation completely unrelated to comparing solar and wind energy.',
    ],
  },
  'parapro-writing-application-006': {
    distractorNotes: [
      'Keeping both "At the present time" and "right now" preserves wordy redundancy and clashes awkwardly with an assembly starting at noon.',
      'The bloated phrase "at this present point in time" repeats the same time idea in six extra words without adding new meaning.',
      'Stacking "Right now at the present time" and "noon is when" remains repetitive and uses an unnecessarily awkward sentence structure.',
    ],
  },
  'parapro-writing-application-007': {
    choices: [
      'Hey! Our class has an awesome service idea, and we really need you to approve it right away.',
      'Dear Principal Ahmed, our class requests permission for a campus cleanup on October 10.',
      'Yo, can our student group use the campus for this project, or is that not going to happen?',
      'Once upon a time, an eager class imagined a Saturday cleanup project taking place at school.',
    ],
    distractorNotes: [
      'Casual slang ("Hey!"), vague phrasing, and a pushy demand ("need you to approve it right away") violate formal tone for a principal.',
      'Slang ("Yo") and a sarcastic, confrontational closing question undermine respect and fail to present a clear, professional request.',
      'A fairy-tale story opening ("Once upon a time") mismatches the genre of a formal permission email and delays the actual request.',
    ],
  },
  'parapro-writing-application-008': {
    choices: [
      'A four-week pilot cut first-period tardiness by 18 percent in records.',
      'The proposed breakfast cart can be painted in school colors with the mascot.',
      'One student wrote that warm breakfast is the most enjoyable meal of the day.',
      'A large digital clock hangs directly above the main school cafeteria entrance.',
    ],
    distractorNotes: [
      'Decorative paint colors and a school mascot describe cart appearance without offering any evidence about morning student arrival times.',
      'One student’s personal enjoyment of breakfast reflects individual opinion rather than measurable evidence that a cart reduces tardiness.',
      'Mentioning a wall clock above the cafeteria doorway has no bearing on whether serving breakfast from a cart improves attendance.',
    ],
  },
  'parapro-writing-application-009': {
    choices: [
      'Tell a sequenced story about solving an unexpected personal problem.',
      'List and define five unit weather terms from the glossary in alphabetical order.',
      'Explain in numbered steps how a student converts a common fraction to a decimal.',
      'Compare the current populations of two cities inside a clearly labeled data table.',
    ],
    distractorNotes: [
      'Listing and defining glossary weather terms in alphabetical order is an informational vocabulary task rather than a narrative story.',
      'Writing numbered instructions for converting fractions to decimals is procedural explanatory writing rather than narrative storytelling.',
      'Organizing city populations into a labeled comparison table is analytical informational work rather than a sequenced personal narrative.',
    ],
  },
  'parapro-writing-application-010': {
    distractorNotes: [
      'The transition "In contrast" signals opposition between two ideas, whereas the second sentence states a positive outcome of the first.',
      'The transition "For example" introduces a specific instance rather than showing a direct result caused by consistent daily measurements.',
      'The transition "Meanwhile" indicates two actions happening at the same time rather than linking a consistent procedure to its outcome.',
    ],
  },
  'parapro-reading-skills-021': {
    distractorNotes: [
      'The passage traces steps taken for one student-council proposal rather than contrasting two competing cafeteria waste plans.',
      'Although members gathered data and cost estimates, the passage never argues that bottle-filling stations are the single possible solution.',
      'The sentences follow connected planning actions marked by first, next, and finally rather than listing unrelated effects without causes.',
    ],
  },
  'parapro-reading-skills-022': {
    choices: [
      'Every single student at school checked out at least one graphic novel.',
      'Biographies and science books recorded the exact same weekly checkouts.',
      'School poetry books were unavailable on shelves during part of the week.',
      'Graphic novels topped biographies and poetry checkouts combined.',
    ],
    distractorNotes: [
      'Weekly category totals count books borrowed overall and never reveal how many individual students checked out a graphic novel.',
      'The table lists 18 biography checkouts and 27 science-book checkouts, showing a nine-book difference rather than equal totals.',
      'A smaller checkout total of 13 poetry books does not prove those books were missing or unavailable during the week.',
    ],
  },
  'parapro-reading-skills-023': {
    choices: [
      'The robotics club meets on Tuesdays and Thursdays.',
      'After-school robotics is the most exciting activity our school offers.',
      'Every middle-school student should be required to join a school club.',
      'The renovated robotics room looks much nicer than the old classroom.',
    ],
    distractorNotes: [
      'Calling robotics "the most exciting activity" expresses a personal value judgment rather than a claim that can be checked objectively.',
      'Stating that students "should be required" to join a club expresses a policy opinion rather than an established verifiable fact.',
      'Describing one room as "much nicer" than another reflects subjective personal taste that different observers could easily disagree about.',
    ],
  },
  'parapro-reading-application-011': {
    choices: [
      'Ask the student to copy the closing sentence neatly three times.',
      'Guide finding clues near the choice and stating the inference.',
      'Tell the student the character’s motive directly before rereading.',
      'Swap the assigned story for a list of unrelated vocabulary words.',
    ],
    distractorNotes: [
      'Copying the final sentence practices handwriting transcription without guiding the learner to connect story clues to the character’s motive.',
      'Handing over the character’s reason upfront removes the analytical thinking task instead of coaching the student to infer from clues.',
      'Replacing the reading passage with unrelated vocabulary drills fails to build text-based inference skills on the assigned story.',
    ],
  },
  'parapro-mathematics-skills-021': {
    distractorNotes: [
      'Sixteen cubic inches adds the three box dimensions (8 + 3 + 5) instead of multiplying length × width × height for volume.',
      'Forty cubic inches multiplies length and height (8 × 5) while leaving out the box’s 3-inch width from the volume product.',
      'Eighty cubic inches miscomputes the three-factor product instead of multiplying 8 × 3 = 24 and then 24 × 5 = 120.',
    ],
  },
  'parapro-mathematics-skills-022': {
    distractorNotes: [
      'Fifteen pages appears twice (making it the mode and median), whereas the mean requires dividing the total of 80 pages by 5.',
      'Fifteen and one-half pages does not result from summing 12 + 15 + 15 + 18 + 20 = 80 and dividing evenly among 5 students.',
      'Seventeen pages overestimates the average because 5 × 17 equals 85 pages rather than the actual combined total of 80 pages.',
    ],
  },
  'parapro-mathematics-application-011': {
    choices: [
      'Have the student memorize the finished expression 3x + 12 without models.',
      'Use an area model for three groups of x and 4 to show 3x + 12.',
      'Tell the student to divide both sides by 3 even though no equation exists.',
      'Have the student substitute x = 0 alone and stop after checking one value.',
    ],
    distractorNotes: [
      'Memorizing 3x + 12 as a single fixed answer leaves the student without conceptual insight into why 3 must multiply both terms.',
      'Dividing both sides applies only when solving an equation with an equals sign, whereas 3(x + 4) is an algebraic expression.',
      'Checking x = 0 shows 12 ≠ 4 and catches a mismatch, yet stopping there never explains the underlying distributive structure.',
    ],
  },
  'parapro-writing-skills-021': {
    distractorNotes: [
      'Joining two full independent clauses with a comma alone produces a comma splice rather than a grammatically sound sentence.',
      'Stacking the words "and because" together leaves the subordinate clause unfinished, producing an ungrammatical sentence construction.',
      'Opening with "Stopping the rain," creates a dangling modifier that illogically claims the relay race itself stopped the rain.',
    ],
  },
  'parapro-writing-skills-022': {
    choices: [
      'When Maya spoke with Elena about it, she said the labels needed larger print.',
      'Speaking with Elena about the science display, she said larger print was needed.',
      'When talking with Elena, Maya said the display labels needed bigger print.',
      'Maya and Elena spoke about the science display because she needed larger labels.',
    ],
    distractorNotes: [
      'Replacing "science display" with "it" adds a second vague pronoun alongside "she," increasing ambiguity instead of clarifying who spoke.',
      'Starting with a participial phrase still leaves "she" ambiguous between Maya and Elena because both names appear in the sentence.',
      'This revision keeps the pronoun "she" ambiguous and shifts the meaning to suggest a person needed larger labels rather than the display.',
    ],
  },
  'parapro-writing-application-011': {
    choices: [
      'A colorful description of the painted hallway murals near the front office',
      'A personal note insisting mornings are the best part of every school day',
      'A directory of unrelated after-school clubs that meet during spring term',
      'Attendance and completion data from a similar morning help program',
    ],
    distractorNotes: [
      'Describing hallway mural colors adds decorative school detail with zero logical connection to student homework completion or academic help.',
      'Stating a personal preference for mornings offers subjective opinion rather than evidence that a homework-help period would benefit students.',
      'Listing unrelated spring after-school clubs provides no evidence regarding morning attendance, homework completion, or academic need.',
    ],
  },
};
