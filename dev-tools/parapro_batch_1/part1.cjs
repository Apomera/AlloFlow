'use strict';

// Balanced-choice, prompt-length, and authored distractor-feedback overrides
// for ParaPro Batch 1 items 1-50 (reading 001-020, reading-app 001-010, math 001-020).
// Distractor notes are supplied as an array of 3 strings in distractor order (excluding answerIndex).
module.exports = {
  'parapro-reading-skills-001': {
    choices: [
      'The neighborhood food pantry requested tomatoes, green beans, and summer squash.',
      'The club improved its garden by spotting a problem and adjusting care.',
      'Raised wooden beds are poorly suited for growing vegetables in summer.',
      'Club members spent every single afternoon watering the entire school garden.',
    ],
    distractorNotes: [
      'The passage names tomatoes, beans, and squash as the club’s harvest, yet it never states that the food pantry requested those specific vegetables.',
      'The midsummer harvest of tomatoes, beans, and squash directly contradicts the claim that raised beds are unsuitable for growing summer vegetables.',
      'Club members checked soil moisture each afternoon and followed a watering schedule, yet the passage never says everyone watered the garden every afternoon.',
    ],
  },
  'parapro-reading-skills-002': {
    choices: [
      'The neighborhood public library serves residents across the surrounding area.',
      'Weekend Saturday access is limited to a single three-hour morning window.',
      'During the opening month, an average of 18 people visited each Saturday.',
      'Average Saturday attendance grew from 18 to 31 after story hour began.',
    ],
    distractorNotes: [
      'Naming the community library identifies which facility is described, yet it offers no attendance data showing whether Saturday visits changed afterward.',
      'Stating that Saturday hours lasted three morning hours describes the library schedule without connecting the new story hour to increased attendance.',
      'The initial average of 18 visitors sets a baseline figure, yet by itself it cannot show growth without comparing it against the later average of 31.',
    ],
  },
  'parapro-reading-skills-003': {
    distractorNotes: [
      'The passage mentions following a bus schedule, yet it never lists step-by-step boarding procedures or an ordered sequence for riding the bus.',
      'Bad weather is noted briefly as one situation where the bus helps Maya, rather than being explained through meteorological causes or effects.',
      'The passage weighs pros and cons of both walking and riding the bus without declaring either travel option to be the single best solution.',
    ],
  },
  'parapro-reading-skills-004': {
    distractorNotes: [
      'Water is poured into both labeled cups during step 2 before any salt is added, so pouring into cup A alone reverses the procedure.',
      'Labeling cups A and B happens first in step 1, well before salt is added to cup B during step 3 of the activity.',
      'The science directions instruct adding one teaspoon of salt to cup B only and never tell the student to place salt into cup A.',
    ],
  },
  'parapro-reading-skills-005': {
    distractorNotes: [
      'The contrasting opening word eager already conveys excitement about performing, so reluctant must carry the opposite sense of holding back.',
      'Wanting several more practice sessions before singing a solo shows that Nia does not yet feel completely prepared to perform alone.',
      'Nia plans to sing the solo once she practices more, so nothing in the sentence suggests she lacks the basic ability to sing.',
    ],
  },
  'parapro-reading-skills-006': {
    distractorNotes: [
      'The sentence describes tournament wins and losses rather than a physical route, so the idiom does not mean literally changing travel direction.',
      'Winning four consecutive matches after redesigning the wheels clearly proves the robotics team kept competing rather than dropping out of events.',
      'The team actively redesigned its wheels to solve earlier problems instead of reverting to an older design from the opening three losses.',
    ],
  },
  'parapro-reading-skills-007': {
    choices: [
      'The science class has just wrapped up a messy laboratory investigation.',
      'Students are packing their supplies to leave school for the afternoon.',
      'The classroom sink and laboratory tables are scheduled for replacement.',
      'The class is preparing to start a lab requiring safety procedures.',
    ],
    distractorNotes: [
      'Setting out fresh goggles, trays, and a board reminder as the bell rings points to beginning a lab activity rather than cleaning up afterward.',
      'Standing at the door and asking students to keep backpacks against the wall prepares a clear lab workspace rather than dismissing students home.',
      'Checking that every table holds a tray and stacking safety goggles beside the sink gives no indication that classroom furniture is being replaced.',
    ],
  },
  'parapro-reading-skills-008': {
    choices: [
      'The school auditorium offers far more space than the outdoor field.',
      'Rehearsal moved indoors because late-afternoon storms are expected.',
      'The school band will perform a concert for the local weather office.',
      'Band students are expected to arrive before morning classes begin.',
    ],
    distractorNotes: [
      'The announcement tells musicians where to report for rehearsal without offering any comparison between the auditorium size and the outdoor area.',
      'The weather office is cited solely as the source forecasting late-afternoon thunderstorms, not as an audience attending a band performance.',
      'The notice directs musicians to bring instruments to the east entrance at 3:15, which is an after-school rehearsal time rather than before school.',
    ],
  },
  'parapro-reading-skills-009': {
    choices: [
      'The city art museum opens its doors at 9:00 on weekday mornings.',
      'The west gallery displays twelve framed nineteenth-century paintings.',
      'General museum admission is free for visiting children under age six.',
      'The sculpture garden is the museum’s most enjoyable exhibit.',
    ],
    distractorNotes: [
      'A museum’s weekday opening time is an objective operational fact that any visitor can verify directly against the published schedule.',
      'The exact count of twelve landscape paintings hanging in the west gallery can be verified objectively by counting the works or checking records.',
      'Free admission for children under six is an official museum pricing policy that can be confirmed factually on posted signs or tickets.',
    ],
  },
  'parapro-reading-skills-010': {
    distractorNotes: [
      'The classroom checkout table lists 18 books for Monday, which is seven books fewer than Thursday’s peak total of 25 checkouts.',
      'Tuesday shows 22 book checkouts in the table, which is the second-highest day yet still three books below Thursday’s total of 25.',
      'Wednesday lists 15 checkouts, making it the lowest checkout day in the entire table rather than the day with the most books borrowed.',
    ],
  },
  'parapro-reading-skills-011': {
    choices: [
      'Cafeteria staff strongly dislike every single change to kitchen routines.',
      'Disposable lunch trays stay faster and cheaper than washable school trays.',
      'Reorganizing cleanup made washable trays practical and cut landfill waste.',
      'The district closed its school cafeteria because tray washing ran too slowly.',
    ],
    distractorNotes: [
      'Staff members voiced one initial concern about extra washing time, yet the passage never says they disliked every change to cafeteria routines.',
      'The passage never compares tray purchase costs, and after reorganizing the station, washable trays added only five minutes to daily cleanup.',
      'The cafeteria stayed open and successfully switched to washable trays once the kitchen reorganized its washing station to keep cleanup quick.',
    ],
  },
  'parapro-reading-skills-012': {
    choices: [
      'To give steps for returning borrowed classroom tools',
      'To persuade students to purchase new personal calculators',
      'To explain how scientific calculators run math operations',
      'To compare features across several calculator model brands',
    ],
    distractorNotes: [
      'The notice instructs students how and when to return borrowed school calculators rather than persuading anyone to buy new equipment.',
      'Nothing in the Room 204 notice teaches mathematical procedures or explains how calculator keys perform arithmetic operations.',
      'The notice mentions numbered pockets and damage reporting without naming or comparing different commercial calculator brands or models.',
    ],
  },
  'parapro-reading-skills-013': {
    choices: [
      'Hallway-clearing time fell from 14 minutes to 8 under the new routine.',
      'Maintenance crews painted the main hallway walls during summer break.',
      'Several grade-level teachers moved planning meetings to the afternoon.',
      'The school mascot emblem appears in the corner of the new arrival map.',
    ],
    distractorNotes: [
      'Fresh summer paint on hallway walls describes building upkeep rather than offering measurable evidence about morning student traffic or crowding.',
      'Afternoon teacher meeting times are unrelated to morning student entry patterns and provide no evidence about whether hallway congestion decreased.',
      'Adding a school mascot logo to an arrival map is a visual design detail that cannot measure whether hallways clear faster in the morning.',
    ],
  },
  'parapro-reading-skills-014': {
    distractorNotes: [
      'The passage traces a single environmental chain from rain to fewer water plants rather than comparing two different hillsides or contrasting ideas.',
      'No explicit question is posed or answered in the passage; instead, each sentence shows how one event directly triggers the next outcome.',
      'Events are sequenced by physical cause and effect from rain to blocked sunlight rather than organized in alphabetical order by topic.',
    ],
  },
  'parapro-reading-skills-015': {
    distractorNotes: [
      'Although yield can mean surrender in legal or military contexts, surrendering makes no sense when describing healthy tomato plants bearing fruit.',
      'Nothing in the sentence mentions tomato stems bending or drooping under weight; the context points to growing plenty of fruit by August.',
      'Predicting plenty of fruit by August describes expected harvest output rather than postponing or delaying the arrival of ripe tomatoes.',
    ],
  },
  'parapro-reading-skills-016': {
    choices: [
      'Jalen plans to hand out the entire slideshow on printed paper.',
      'The classroom computer has never displayed a slideshow before.',
      'Jalen deleted the key data graph from the digital presentation.',
      'Jalen is preparing backups in case classroom tech fails.',
    ],
    distractorNotes: [
      'Jalen printed only a single page containing the key graph rather than making paper copies of the full slideshow to hand out.',
      'Testing the presentation ahead of time shows prudent preparation rather than proving the classroom computer has never shown slides before.',
      'Printing one backup copy of the key graph does not imply that Jalen removed that graph from the main digital slideshow.',
    ],
  },
  'parapro-reading-skills-017': {
    choices: [
      'The paved hiking trail measures exactly 2.4 miles from start to end.',
      'The view from the final overlook is worth the steep climb.',
      'Two chilled water fountains stand beside the main park entrance.',
      'The county nature park closes its vehicle gate each day at sunset.',
    ],
    distractorNotes: [
      'A trail’s 2.4-mile length is a measurable physical distance that can be checked objectively on a park map or odometer.',
      'The presence and count of two water fountains beside the park entrance can be verified directly through simple physical observation.',
      'Closing the park gate at sunset is an official posted park rule that any visitor can verify factually rather than a personal opinion.',
    ],
  },
  'parapro-reading-skills-018': {
    distractorNotes: [
      'The table shows attendance rising from 48 in October to 55 in November—an increase of seven students rather than remaining unchanged.',
      'December recorded 61 students, which is the highest monthly attendance in the table rather than a sharp drop from November’s 55.',
      'September’s total of 42 students is the lowest monthly figure in the table rather than the highest attendance across the four months.',
    ],
  },
  'parapro-reading-skills-019': {
    choices: [
      'Students should replace every cited source before handing in a report.',
      'Adding sequential page numbers matters far more than accurate citations.',
      'Students should finish three final checks before submitting a report.',
      'Every finished student document must be saved without a descriptive name.',
    ],
    distractorNotes: [
      'The directions instruct students to confirm that every cited source appears in the reference list, not to discard and replace their sources.',
      'All three directions—verifying references, numbering pages, and naming the file—are presented in order without ranking page numbers above citations.',
      'The final step explicitly requires saving the document with both the student’s last name and assignment number rather than leaving it unnamed.',
    ],
  },
  'parapro-reading-skills-020': {
    distractorNotes: [
      'Multiplying six boxes by 12 pencils per box gives 72 individual pencils in total, which exceeds the target count of 50 items.',
      'Multiplying four boxes by 8 markers per box gives 32 individual markers in total, falling 18 items short of the requested 50 items.',
      'Neither pencils (72 items) nor markers (32 items) equal 50 individual items separately, and combining both supplies totals 104 items.',
    ],
  },
  'parapro-reading-application-001': {
    distractorNotes: [
      'The closed-syllable word "cap" uses a short a vowel sound and lacks a final silent e to signal a long vowel.',
      'The closed-syllable word "hop" uses a short o vowel sound and contains no final silent e at the end of the word.',
      'The closed-syllable word "pet" uses a short e vowel sound and does not follow the vowel-consonant-silent-e long-vowel pattern.',
    ],
  },
  'parapro-reading-application-002': {
    distractorNotes: [
      'Although "late" shares the initial /l/ sound with "light," it ends with the long /āt/ rime rather than matching the /īt/ rhyme.',
      'The word "let" shares only the opening /l/ consonant and ends with the short /ĕt/ rime instead of rhyming with /īt/.',
      'The word "lot" begins with /l/ like "light" yet ends with the short /ŏt/ rime, so it does not rhyme with "light."',
    ],
  },
  'parapro-reading-application-003': {
    distractorNotes: [
      'Because "computer" contains three distinct spoken vowel sounds (com-pu-ter), it cannot be pronounced smoothly as a single one-syllable beat.',
      'Dividing "computer" into only two syllables would leave two separate spoken vowel sounds crammed inside one undivided chunk.',
      'Saying "computer" aloud produces three natural spoken syllable beats (com-pu-ter) rather than four separate vowel-centered syllables.',
    ],
  },
  'parapro-reading-application-004': {
    distractorNotes: [
      'The prefix "pre-" (as in preview or preheat) commonly means "before," whereas "re-" in "reread" signals repeating an action.',
      'The suffix "-less" (as in careless) or prefix "non-" conveys "without," while "re-" indicates doing the base verb a second time.',
      'The prefix "mis-" (as in misread) signals doing something incorrectly, whereas "re-" in "reread" means reading the text again.',
    ],
  },
  'parapro-reading-application-005': {
    distractorNotes: [
      'Warm direct sunlight raises an ice cube’s temperature and turns solid ice into liquid water rather than causing it to freeze.',
      'Although the sun itself shines brightly, the pronoun "it" refers back to the ice cube, which melts rather than shining.',
      'An ice cube is an inanimate object that cannot perform the action of measuring something after being placed in sunlight.',
    ],
  },
  'parapro-reading-application-006': {
    distractorNotes: [
      'The word "careless" means failing to pay close attention to safety or detail, making it an antonym rather than a synonym of "cautious."',
      'The word "noisy" describes loud volume or sound level and does not express being careful or watchful about potential risks.',
      'The word "rapid" refers to quick physical speed or pace rather than taking careful, deliberate steps to avoid mistakes or danger.',
    ],
  },
  'parapro-reading-application-007': {
    distractorNotes: [
      'Both "branch" and "brave" start with "bra," so comparing the fourth letter shows "branch" (n) must come before "brave" (v).',
      'Words beginning with "bra" must precede "bread" ("bre"), and within the "bra" pair, "branch" must also come ahead of "brave."',
      'This list places the words in reverse alphabetical order, putting "brick" ("bri") first when it belongs last after "bra" and "bre."',
    ],
  },
  'parapro-reading-application-008': {
    choices: [
      'Preview title, headings, map, and captions, then predict the focus.',
      'Copy every sentence from the closing paragraph before starting to read.',
      'Skip unfamiliar bold vocabulary words and ignore all maps and graphics.',
      'Read the printed page numbers alone and judge if the author is right.',
    ],
    distractorNotes: [
      'Copying the closing paragraph mechanically takes time without activating prior knowledge or helping students preview the article’s overall structure.',
      'Skipping domain vocabulary and ignoring migration maps discards crucial visual and semantic clues that help students comprehend informational text.',
      'Checking page numbers offers zero content information and gives readers no basis for predicting ideas or evaluating an author’s claims.',
    ],
  },
  'parapro-reading-application-009': {
    choices: [
      'What changed in the character, and what two clues support that?',
      'Did you enjoy reading this story? Give a quick yes-or-no reply.',
      'How many printed pages did you turn from start through the end?',
      'Can you copy the exact story title as printed on the cover page?',
    ],
    distractorNotes: [
      'Asking for a yes-or-no enjoyment reaction captures personal opinion without providing any observable evidence of inferential text comprehension.',
      'Counting how many pages were turned tracks physical book handling rather than demonstrating whether the student understood implied character changes.',
      'Copying the printed title word for word checks visual transcription skills rather than showing whether the student can make an inference.',
    ],
  },
  'parapro-reading-application-010': {
    distractorNotes: [
      'Underlining both words applies only the noun mark and fails to circle the action verb "migrate" as the directions specify.',
      'Circling "Birds" and underlining "migrate" reverses both required markings because "Birds" is the noun and "migrate" is the verb.',
      'Circling the verb "migrate" completes only half of the two-step task while leaving the noun "Birds" completely unmarked.',
    ],
  },
  'parapro-mathematics-skills-001': {
    prompt: 'Without using a calculator, compute the whole-number difference: what is 684 − 297?',
    distractorNotes: [
      'Choosing 397 is ten too large because adding 397 + 297 equals 694 rather than 684, showing a tens-place regrouping slip.',
      'Selecting 377 is ten too small because adding 377 + 297 equals 674 instead of 684 after borrowing twice in the tens column.',
      'Arriving at 481 reflects subtracting smaller digits from larger digits in each column without regrouping across the tens and hundreds.',
    ],
  },
  'parapro-mathematics-skills-002': {
    prompt: 'Without using a calculator, find the fraction sum in simplest form: what is 3/4 + 1/8?',
    distractorNotes: [
      'Getting 4/12 adds numerators (3 + 1) and denominators (4 + 8) straight across instead of finding a common denominator of 8.',
      'One-half (4/8) is actually smaller than the starting fraction 3/4 (6/8), so it cannot result from adding a positive fraction.',
      'Choosing 5/8 subtracts 1/8 from 6/8 instead of adding, or miscalculates the equivalent eighths fraction for 3/4.',
    ],
  },
  'parapro-mathematics-skills-003': {
    prompt: 'Without using a calculator, compute the decimal quotient: what is 4.8 ÷ 0.6?',
    distractorNotes: [
      'Selecting 0.8 misplaces the decimal point after scaling both dividend and divisor by 10, leaving the quotient ten times too small.',
      'Choosing 80 shifts the decimal point one extra place to the right after solving 48 ÷ 6 = 8, making the answer ten times too large.',
      'Calculating 2.88 multiplies 4.8 by 0.6 instead of dividing, producing a smaller product rather than the quotient 8.',
    ],
  },
  'parapro-mathematics-skills-004': {
    distractorNotes: [
      'Adding 6 + 4 once equals 10 rather than representing six equal groups of four items totaling the product 24.',
      'Adding six copies of 6 (6 + 6 + 6 + 6 + 6 + 6) equals 36 and models 6 × 6 instead of six groups of 4.',
      'Alternating 4 and 6 (4 + 6 + 4 + 6) sums to 20 and mixes unequal addends rather than showing six equal groups of 4.',
    ],
  },
  'parapro-mathematics-skills-005': {
    prompt: 'Without using a calculator, compare the rational numbers below. Which comparison is true?',
    distractorNotes: [
      'Comparing place values shows 0.72 (72 hundredths) is greater than 0.70 (70 hundredths), so writing 0.72 < 0.7 reverses the order.',
      'Converting both fractions to eighths shows 5/8 is smaller than 3/4 (6/8), so claiming 5/8 > 3/4 is false.',
      'Comparing the hundredths digit shows 1.05 (one and 50 thousandths) is greater than 1.005 (one and 5 thousandths), not smaller.',
    ],
  },
  'parapro-mathematics-skills-006': {
    distractorNotes: [
      'In arithmetic vocabulary, a product names the result of multiplying two or more factors rather than dividing one number by another.',
      'A difference names the result obtained when subtracting one quantity from another rather than the answer to a division problem.',
      'A sum names the combined total obtained from adding numbers together rather than the result of a division calculation.',
    ],
  },
  'parapro-mathematics-skills-007': {
    distractorNotes: [
      'The decimal 0.35 lies five hundredths below 0.40 on the number line, placing it completely outside the interval between 0.4 and 0.5.',
      'The decimal 0.54 is four hundredths greater than 0.50, so it falls past the upper endpoint rather than halfway between 0.4 and 0.5.',
      'Although 0.405 sits between 0.400 and 0.500, it is only 0.005 above 0.4 instead of halfway at 0.450.',
    ],
  },
  'parapro-mathematics-skills-008': {
    distractorNotes: [
      'Converting 2/3 to a decimal gives the repeating value 0.666..., which is less than 0.75 (75 hundredths).',
      'Seven-tenths (7/10) converts directly to 0.70 rather than 0.75, falling five full hundredths short of three-fourths.',
      'Four-fifths (4/5) converts to 8/10 or 0.80, which is five hundredths greater than the target decimal 0.75.',
    ],
  },
  'parapro-mathematics-skills-009': {
    distractorNotes: [
      'In 42.681, the digit 6 sits immediately to the right of the decimal point in the tenths place, not the digit 8.',
      'The digit 1 occupies the third position to the right of the decimal point (thousandths), whereas 8 sits one place to its left.',
      'The digit 2 sits immediately to the left of the decimal point in the ones place, whereas 8 lies two places to the right.',
    ],
  },
  'parapro-mathematics-skills-010': {
    prompt: 'Without using a calculator, compute the percentage of a whole number: what is 35 percent of 80?',
    distractorNotes: [
      'Twenty-four equals 30 percent of 80 (0.30 × 80), leaving out the extra 5 percent (4) needed to reach 35 percent.',
      'Thirty-two equals 40 percent of 80 (0.40 × 80), which is 5 percent (4) higher than the requested 35 percent.',
      'Choosing 45 subtracts 35 directly from 80 (80 − 35) instead of multiplying 80 by the percent rate 0.35.',
    ],
  },
  'parapro-mathematics-skills-011': {
    prompt: 'Without using a calculator, evaluate the exponential expression: what is the value of 2⁵?',
    distractorNotes: [
      'Ten equals the simple product 2 × 5 instead of multiplying five factors of 2 together (2 × 2 × 2 × 2 × 2).',
      'Twenty-five equals 5² (5 × 5), reversing the base and the exponent rather than raising the base 2 to the fifth power.',
      'Sixty-four equals 2⁶ (multiplying six factors of 2 instead of five), which doubles the correct value of 32.',
    ],
  },
  'parapro-mathematics-skills-012': {
    prompt: 'Without using a calculator, apply the order of operations to evaluate: what is 18 − 3 × 4?',
    distractorNotes: [
      'Getting 60 subtracts 18 − 3 first before multiplying by 4, violating the standard order of operations requiring multiplication first.',
      'Choosing 12 evaluates the product 3 × 4 correctly yet stops without subtracting that product from 18.',
      'Selecting 4 miscalculates either the multiplication or the final subtraction step instead of computing 18 − 12 = 6.',
    ],
  },
  'parapro-mathematics-skills-013': {
    distractorNotes: [
      'Estimating 1,000 is only one-tenth as large as 200 × 50 = 10,000, dropping a full place-value zero during mental multiplication.',
      'Estimating 5,000 halves the rounded product (using 25 instead of 50 with 200), greatly underestimating 198 × 51.',
      'Estimating 15,000 overstates the rounded product 200 × 50 by fifty percent, far above the true product of 10,098.',
    ],
  },
  'parapro-mathematics-skills-014': {
    distractorNotes: [
      'Getting 92 misses part of the seven-box total (7 × 24 = 168) before subtracting the 38 distributed notebooks.',
      'Choosing 158 subtracts only 10 notebooks from 168 instead of subtracting all 38 notebooks that were distributed.',
      'Arriving at 206 adds the 38 distributed notebooks onto 168 (168 + 38) rather than subtracting them to find how many remained.',
    ],
  },
  'parapro-mathematics-skills-015': {
    distractorNotes: [
      'Selecting 24 subtracts 3 from 27 (27 − 3) instead of using the inverse operation of division to undo multiplying by 3.',
      'Choosing 30 adds 3 to 27 (27 + 3) rather than dividing both sides of the equation 3x = 27 by the coefficient 3.',
      'Picking 81 multiplies 27 by 3 instead of dividing 27 by 3, which produces 3 × 81 = 243 rather than 27.',
    ],
  },
  'parapro-mathematics-skills-016': {
    distractorNotes: [
      'Choosing 18 increases the previous term 17 by only 1 instead of continuing the constant step of +4 seen across every pair.',
      'Selecting 19 adds 2 to 17 rather than applying the consistent arithmetic pattern of adding 4 to each term.',
      'Picking 20 adds 3 to 17 instead of adding 4, stopping one full unit short of the next arithmetic term 21.',
    ],
  },
  'parapro-mathematics-skills-017': {
    distractorNotes: [
      'Ending at 3:25 p.m. adds only 40 minutes after 2:45 p.m., leaving out 10 minutes of the stated 50-minute meeting.',
      'Ending at 3:45 p.m. adds a full 60 minutes (one whole hour) to 2:45 p.m. rather than the stated 50 minutes.',
      'Ending at 4:05 p.m. adds 80 minutes (1 hour and 20 minutes) to 2:45 p.m., exceeding the 50-minute meeting by half an hour.',
    ],
  },
  'parapro-mathematics-skills-018': {
    distractorNotes: [
      'Six feet equals only 72 inches (6 × 12), which leaves the measurement one full foot (12 inches) short of 84 inches.',
      'Eight feet equals 96 inches (8 × 12), which exceeds the stated measurement of 84 inches by one full foot (12 inches).',
      'Twelve is the conversion factor of inches in a single foot rather than the result of dividing 84 inches by 12.',
    ],
  },
  'parapro-mathematics-skills-019': {
    distractorNotes: [
      'A rectangle has two pairs of parallel opposite sides (top/bottom and left/right), not just one single pair.',
      'A square is a special rectangle with four right angles and two pairs of parallel opposite sides rather than one pair.',
      'A rhombus is a parallelogram with four equal sides and two pairs of parallel opposite sides rather than exactly one pair.',
    ],
  },
  'parapro-mathematics-skills-020': {
    distractorNotes: [
      'Thirteen centimeters adds only one length and one width (9 + 4), leaving out the other two opposite sides of the rectangle.',
      'Eighteen centimeters doubles only the 9-centimeter length (9 + 9) and forgets to include the two 4-centimeter widths.',
      'Thirty-six square centimeters computes the rectangle’s interior area (9 × 4) in square units rather than its outer perimeter.',
    ],
  },
};
