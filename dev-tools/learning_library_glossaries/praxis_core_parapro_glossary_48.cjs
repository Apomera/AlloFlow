'use strict';

const CORE_5713 =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5713.pdf';
const CORE_5723 =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5723.pdf';
const CORE_5733 =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5733.pdf';
const CCSS_ELA = 'https://www.thecorestandards.org/ELA-Literacy/';
const CCSS_MATH = 'https://www.thecorestandards.org/Math/';

const PARAPRO_ETS = 'https://www.ets.org/pdfs/parapro/1755.pdf';
const PARAPRO_WWC_READING =
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published';
const PARAPRO_PREALGEBRA =
  'https://openstax.org/details/books/prealgebra-2e/';
const PARAPRO_WRITING_HANDBOOK =
  'https://openstax.org/books/writing-guide/pages/handbook';
const PARAPRO_WRITING_PROCESS =
  'https://openstax.org/books/writing-guide/pages/16-5-writing-process-thinking-critically-about-text';

function makeEntry({
  id,
  term,
  definition,
  aliases,
  chapterId,
  chapterTitle,
  domainId,
  domainLabel,
  sectionId,
  sectionHeading,
  references,
}) {
  return {
    id,
    term,
    definition,
    aliases,
    chapterIds: [chapterId],
    domainIds: [domainId],
    linkage: {
      occurrences: [
        {
          chapterId,
          chapterTitle,
          domainId,
          domain: domainLabel,
          sectionId,
          sectionHeading,
          occurrences: 1,
        },
      ],
    },
    reviewStatus: 'source-reviewed-editorial-pass',
    references: references.slice(),
  };
}

const praxis_core_5752 = [
  // Chapter 1: Main Ideas, Supporting Details, and Inferences
  makeEntry({
    id: 'core5752-gloss-01',
    term: 'Primary purpose',
    definition:
      'Overarching rhetorical goal driving a passage, such as explaining a phenomenon, evaluating a policy, or refuting a claim, verified by checking whether it accounts for the entire text\'s scope.',
    aliases: ['Authorial purpose'],
    chapterId: 'core5752-ch-01',
    chapterTitle: 'Main Ideas, Supporting Details, and Inferences',
    domainId: 'reading-key-ideas-details',
    domainLabel: 'Reading: Key Ideas and Details',
    sectionId: 'core5752-ch-01-section-01',
    sectionHeading: 'Main idea and primary purpose',
    references: [CORE_5713, CCSS_ELA],
  }),
  makeEntry({
    id: 'core5752-gloss-02',
    term: 'Textual inference',
    definition:
      'Conclusion logically supported by explicit passage clues without adding unstated outside beliefs; on Praxis Core Reading, valid inferences remain strictly bounded by what the text implies.',
    aliases: ['Logical implication'],
    chapterId: 'core5752-ch-01',
    chapterTitle: 'Main Ideas, Supporting Details, and Inferences',
    domainId: 'reading-key-ideas-details',
    domainLabel: 'Reading: Key Ideas and Details',
    sectionId: 'core5752-ch-01-section-03',
    sectionHeading: 'Inference and implication',
    references: [CORE_5713, CCSS_ELA],
  }),

  // Chapter 2: Craft, Structure, Tone, and Vocabulary in Context
  makeEntry({
    id: 'core5752-gloss-03',
    term: 'Authorial tone',
    definition:
      'Writer\'s discernible stance toward a subject or audience, such as skeptical, measured, or admiring, signaled through word connotations, qualifying hedges, and framing choices across the text.',
    aliases: ['Attitude'],
    chapterId: 'core5752-ch-02',
    chapterTitle: 'Craft, Structure, Tone, and Vocabulary in Context',
    domainId: 'reading-craft-structure-language',
    domainLabel: 'Reading: Craft, Structure, and Language',
    sectionId: 'core5752-ch-02-section-01',
    sectionHeading: 'Tone and attitude',
    references: [CORE_5713, CCSS_ELA],
  }),
  makeEntry({
    id: 'core5752-gloss-04',
    term: 'Rhetorical function',
    definition:
      'Strategic job a sentence, example, or paragraph performs within a passage\'s structure, such as introducing a concession, illustrating a general principle, or pivoting to a contrasting claim.',
    aliases: ['Structural role'],
    chapterId: 'core5752-ch-02',
    chapterTitle: 'Craft, Structure, Tone, and Vocabulary in Context',
    domainId: 'reading-craft-structure-language',
    domainLabel: 'Reading: Craft, Structure, and Language',
    sectionId: 'core5752-ch-02-section-02',
    sectionHeading: 'Organization and transitions',
    references: [CORE_5713, CCSS_ELA],
  }),

  // Chapter 3: Arguments, Visual Information, and Paired Texts
  makeEntry({
    id: 'core5752-gloss-05',
    term: 'Unstated assumption',
    definition:
      'Unexpressed premise required to connect an author\'s stated evidence to a conclusion; exposing a questionable assumption weakens an argument, whereas confirming it reinforces the logical link.',
    aliases: ['Implicit premise'],
    chapterId: 'core5752-ch-03',
    chapterTitle: 'Arguments, Visual Information, and Paired Texts',
    domainId: 'reading-integration-knowledge-ideas',
    domainLabel: 'Reading: Integration of Knowledge and Ideas',
    sectionId: 'core5752-ch-03-section-01',
    sectionHeading: 'Claims, reasons, and assumptions',
    references: [CORE_5713, CCSS_ELA],
  }),
  makeEntry({
    id: 'core5752-gloss-06',
    term: 'Cross-text synthesis',
    definition:
      'Evaluating two paired passages together to locate shared premises, pinpoint disagreements, and determine how evidence in one text qualifies, extends, or challenges the argument in the other.',
    aliases: ['Paired-text integration'],
    chapterId: 'core5752-ch-03',
    chapterTitle: 'Arguments, Visual Information, and Paired Texts',
    domainId: 'reading-integration-knowledge-ideas',
    domainLabel: 'Reading: Integration of Knowledge and Ideas',
    sectionId: 'core5752-ch-03-section-04',
    sectionHeading: 'Paired-text comparison and synthesis',
    references: [CORE_5713, CCSS_ELA],
  }),

  // Chapter 4: Argument, Organization, Revision, and Synthesis
  makeEntry({
    id: 'core5752-gloss-07',
    term: 'Defensible thesis',
    definition:
      'Clear, arguable central claim anchoring an argumentative or source-based essay that commits to a reasoned position and previews the organizing logic developed across body paragraphs.',
    aliases: ['Central claim'],
    chapterId: 'core5752-ch-04',
    chapterTitle: 'Argument, Organization, Revision, and Synthesis',
    domainId: 'writing-text-types-production',
    domainLabel: 'Writing: Text Types, Purposes, and Production',
    sectionId: 'core5752-ch-04-section-01',
    sectionHeading: 'Thesis, audience, and purpose',
    references: [CORE_5723, CCSS_ELA],
  }),
  makeEntry({
    id: 'core5752-gloss-08',
    term: 'Counterargument and rebuttal',
    definition:
      'Rhetorical move that fairly represents an opposing viewpoint or limitation and answers it with targeted reasoning and evidence, strengthening persuasiveness in argumentative and source-based essays.',
    aliases: ['Counterclaim'],
    chapterId: 'core5752-ch-04',
    chapterTitle: 'Argument, Organization, Revision, and Synthesis',
    domainId: 'writing-text-types-production',
    domainLabel: 'Writing: Text Types, Purposes, and Production',
    sectionId: 'core5752-ch-04-section-04',
    sectionHeading: 'Evidence integration and conclusions',
    references: [CORE_5723, CCSS_ELA],
  }),

  // Chapter 5: Usage, Sentence Structure, Mechanics, and Word Choice
  makeEntry({
    id: 'core5752-gloss-09',
    term: 'Comma splice',
    definition:
      'Sentence-boundary error joining two independent clauses with only a comma; it is corrected by adding a coordinating conjunction, inserting a semicolon or period, or subordinating one clause.',
    aliases: ['Clause-boundary error'],
    chapterId: 'core5752-ch-05',
    chapterTitle: 'Usage, Sentence Structure, Mechanics, and Word Choice',
    domainId: 'writing-language-research',
    domainLabel: 'Writing: Language and Research Skills',
    sectionId: 'core5752-ch-05-section-02',
    sectionHeading: 'Sentence boundaries and clauses',
    references: [CORE_5723, CCSS_ELA],
  }),
  makeEntry({
    id: 'core5752-gloss-10',
    term: 'Parallel structure',
    definition:
      'Presenting coordinate items, comparisons, or paired ideas in matching grammatical forms, such as consistent infinitives, gerunds, or clauses, to maintain clarity and standard English usage.',
    aliases: ['Parallelism'],
    chapterId: 'core5752-ch-05',
    chapterTitle: 'Usage, Sentence Structure, Mechanics, and Word Choice',
    domainId: 'writing-language-research',
    domainLabel: 'Writing: Language and Research Skills',
    sectionId: 'core5752-ch-05-section-03',
    sectionHeading: 'Modifiers, parallelism, and tense',
    references: [CORE_5723, CCSS_ELA],
  }),

  // Chapter 6: Research Strategy, Source Credibility, Citation, and Synthesis
  makeEntry({
    id: 'core5752-gloss-11',
    term: 'Source credibility',
    definition:
      'Assessment of a reference\'s trustworthiness based on author expertise, transparent or peer-reviewed methodology, publication purpose, currency, and fit for the specific research question.',
    aliases: ['Source authority'],
    chapterId: 'core5752-ch-06',
    chapterTitle:
      'Research Strategy, Source Credibility, Citation, and Synthesis',
    domainId: 'writing-language-research',
    domainLabel: 'Writing: Language and Research Skills',
    sectionId: 'core5752-ch-06-section-02',
    sectionHeading: 'Credibility and applicability',
    references: [CORE_5723, CCSS_ELA],
  }),
  makeEntry({
    id: 'core5752-gloss-12',
    term: 'Source attribution',
    definition:
      'Explicitly crediting original authors whenever quoting verbatim wording or paraphrasing findings and ideas, separating the writer\'s synthesis from borrowed material and preventing plagiarism.',
    aliases: ['In-text citation'],
    chapterId: 'core5752-ch-06',
    chapterTitle:
      'Research Strategy, Source Credibility, Citation, and Synthesis',
    domainId: 'writing-language-research',
    domainLabel: 'Writing: Language and Research Skills',
    sectionId: 'core5752-ch-06-section-03',
    sectionHeading: 'Quotation, paraphrase, and citation',
    references: [CORE_5723, CCSS_ELA],
  }),

  // Chapter 7: Number Forms, Operations, and Quantitative Reasoning
  makeEntry({
    id: 'core5752-gloss-13',
    term: 'Absolute value',
    definition:
      'Nonnegative distance of a real number from zero on a number line, independent of sign, used to compute net distance between signed quantities and verify tolerance intervals.',
    aliases: ['Magnitude'],
    chapterId: 'core5752-ch-07',
    chapterTitle: 'Number Forms, Operations, and Quantitative Reasoning',
    domainId: 'math-number-quantity',
    domainLabel: 'Mathematics: Number and Quantity',
    sectionId: 'core5752-ch-07-section-01',
    sectionHeading: 'Integers and operation meaning',
    references: [CORE_5733, CCSS_MATH],
  }),
  makeEntry({
    id: 'core5752-gloss-14',
    term: 'Prime factorization',
    definition:
      'Expressing a composite integer as a unique product of prime numbers, enabling efficient calculation of greatest common factors, least common multiples, and reduced fractional forms.',
    aliases: ['Factor decomposition'],
    chapterId: 'core5752-ch-07',
    chapterTitle: 'Number Forms, Operations, and Quantitative Reasoning',
    domainId: 'math-number-quantity',
    domainLabel: 'Mathematics: Number and Quantity',
    sectionId: 'core5752-ch-07-section-03',
    sectionHeading: 'Factors, multiples, and number properties',
    references: [CORE_5733, CCSS_MATH],
  }),

  // Chapter 8: Ratios, Proportions, Percent, Rates, and Measurement
  makeEntry({
    id: 'core5752-gloss-15',
    term: 'Unit rate',
    definition:
      'Ratio scaled so the second quantity equals one unit, such as miles per hour or dollars per pound, allowing direct rate comparison and reliable setup of proportional equations.',
    aliases: ['Constant of proportionality'],
    chapterId: 'core5752-ch-08',
    chapterTitle: 'Ratios, Proportions, Percent, Rates, and Measurement',
    domainId: 'math-number-quantity',
    domainLabel: 'Mathematics: Number and Quantity',
    sectionId: 'core5752-ch-08-section-01',
    sectionHeading: 'Ratios, proportions, and unit rates',
    references: [CORE_5733, CCSS_MATH],
  }),
  makeEntry({
    id: 'core5752-gloss-16',
    term: 'Percent change',
    definition:
      'Ratio of the difference between a new value and an original base value divided by the original value and multiplied by 100, distinguishing relative growth or decline from raw point changes.',
    aliases: ['Relative change'],
    chapterId: 'core5752-ch-08',
    chapterTitle: 'Ratios, Proportions, Percent, Rates, and Measurement',
    domainId: 'math-number-quantity',
    domainLabel: 'Mathematics: Number and Quantity',
    sectionId: 'core5752-ch-08-section-02',
    sectionHeading: 'Percent and percent change',
    references: [CORE_5733, CCSS_MATH],
  }),

  // Chapter 9: Data Displays and Descriptive Measures
  makeEntry({
    id: 'core5752-gloss-17',
    term: 'Truncated scale',
    definition:
      'Graph axis that begins above zero rather than at a true zero baseline, visually exaggerating modest differences among bars or trends unless readers inspect labeled tick intervals carefully.',
    aliases: ['Broken axis'],
    chapterId: 'core5752-ch-09',
    chapterTitle: 'Data Displays and Descriptive Measures',
    domainId: 'math-data-statistics-probability',
    domainLabel: 'Mathematics: Data, Statistics, and Probability',
    sectionId: 'core5752-ch-09-section-01',
    sectionHeading: 'Reading tables and graphs',
    references: [CORE_5733, CCSS_MATH],
  }),
  makeEntry({
    id: 'core5752-gloss-18',
    term: 'Outlier effect',
    definition:
      'Distortion of descriptive statistics caused by an extreme high or low observation, which shifts the arithmetic mean and range substantially while leaving the median comparatively resistant.',
    aliases: ['Extreme value impact'],
    chapterId: 'core5752-ch-09',
    chapterTitle: 'Data Displays and Descriptive Measures',
    domainId: 'math-data-statistics-probability',
    domainLabel: 'Mathematics: Data, Statistics, and Probability',
    sectionId: 'core5752-ch-09-section-03',
    sectionHeading: 'Distribution and comparison',
    references: [CORE_5733, CCSS_MATH],
  }),

  // Chapter 10: Statistics, Sampling, Study Design, and Probability
  makeEntry({
    id: 'core5752-gloss-19',
    term: 'Random assignment',
    definition:
      'Allocating participants to treatment or control groups by chance so confounding variables distribute evenly across groups, permitting valid causal inference rather than mere association.',
    aliases: ['Experimental randomization'],
    chapterId: 'core5752-ch-10',
    chapterTitle: 'Statistics, Sampling, Study Design, and Probability',
    domainId: 'math-data-statistics-probability',
    domainLabel: 'Mathematics: Data, Statistics, and Probability',
    sectionId: 'core5752-ch-10-section-02',
    sectionHeading: 'Experiments and observational studies',
    references: [CORE_5733, CCSS_MATH],
  }),
  makeEntry({
    id: 'core5752-gloss-20',
    term: 'Independent events',
    definition:
      'Two events whose outcomes do not affect each other\'s likelihood, so the probability of both occurring equals the product of their individual probabilities, P(A) times P(B).',
    aliases: ['Statistical independence'],
    chapterId: 'core5752-ch-10',
    chapterTitle: 'Statistics, Sampling, Study Design, and Probability',
    domainId: 'math-data-statistics-probability',
    domainLabel: 'Mathematics: Data, Statistics, and Probability',
    sectionId: 'core5752-ch-10-section-04',
    sectionHeading: 'Probability models',
    references: [CORE_5733, CCSS_MATH],
  }),

  // Chapter 11: Algebraic Expressions, Equations, Inequalities, and Functions
  makeEntry({
    id: 'core5752-gloss-21',
    term: 'Function domain',
    definition:
      'Complete set of allowable input values for which a function assigns exactly one defined output, honoring algebraic restrictions such as nonzero denominators and real-world context bounds.',
    aliases: ['Input set'],
    chapterId: 'core5752-ch-11',
    chapterTitle:
      'Algebraic Expressions, Equations, Inequalities, and Functions',
    domainId: 'math-algebra-geometry',
    domainLabel: 'Mathematics: Algebra and Geometry',
    sectionId: 'core5752-ch-11-section-03',
    sectionHeading: 'Functions and representations',
    references: [CORE_5733, CCSS_MATH],
  }),
  makeEntry({
    id: 'core5752-gloss-22',
    term: 'Slope-intercept form',
    definition:
      'Linear equation written as y = mx + b that directly displays the constant rate of change (slope m) and starting value at x = 0 (y-intercept b), linking algebraic rules to coordinate graphs.',
    aliases: ['Linear model'],
    chapterId: 'core5752-ch-11',
    chapterTitle:
      'Algebraic Expressions, Equations, Inequalities, and Functions',
    domainId: 'math-algebra-geometry',
    domainLabel: 'Mathematics: Algebra and Geometry',
    sectionId: 'core5752-ch-11-section-04',
    sectionHeading: 'Linear relationships and slope',
    references: [CORE_5733, CCSS_MATH],
  }),

  // Chapter 12: Geometry, Similarity, Area, Surface Area, and Volume
  makeEntry({
    id: 'core5752-gloss-23',
    term: 'Surface area',
    definition:
      'Combined two-dimensional area of all outer faces or curved surfaces enclosing a three-dimensional solid, expressed in square units rather than the cubic units used to measure volume.',
    aliases: ['Total face area'],
    chapterId: 'core5752-ch-12',
    chapterTitle: 'Geometry, Similarity, Area, Surface Area, and Volume',
    domainId: 'math-algebra-geometry',
    domainLabel: 'Mathematics: Algebra and Geometry',
    sectionId: 'core5752-ch-12-section-03',
    sectionHeading: 'Surface area and volume',
    references: [CORE_5733, CCSS_MATH],
  }),
  makeEntry({
    id: 'core5752-gloss-24',
    term: 'Scale factor',
    definition:
      'Constant ratio between corresponding linear dimensions of similar figures; multiplying side lengths by k multiplies area by k squared and volume by k cubed while preserving angle measures.',
    aliases: ['Similarity ratio'],
    chapterId: 'core5752-ch-12',
    chapterTitle: 'Geometry, Similarity, Area, Surface Area, and Volume',
    domainId: 'math-algebra-geometry',
    domainLabel: 'Mathematics: Algebra and Geometry',
    sectionId: 'core5752-ch-12-section-04',
    sectionHeading: 'Similarity and right triangles',
    references: [CORE_5733, CCSS_MATH],
  }),
];

const parapro = [
  // Chapter 1: Main Ideas, Details, and Evidence
  makeEntry({
    id: 'parapro-gloss-01',
    term: 'Controlling idea',
    definition:
      'Specific central point an author communicates about a general topic across a paragraph or passage, broader than any isolated detail yet narrow enough to fit the text\'s actual scope.',
    aliases: ['Main idea'],
    chapterId: 'parapro-ch-01',
    chapterTitle: 'Main Ideas, Details, and Evidence',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-01-section-1',
    sectionHeading: 'From topic to main idea',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),
  makeEntry({
    id: 'parapro-gloss-02',
    term: 'Gradual release of responsibility',
    definition:
      'Instructional sequence moving from explicit modeling to guided practice and independent reading, helping paraprofessionals prompt students with evidence questions without taking over the task.',
    aliases: ['Gradual release'],
    chapterId: 'parapro-ch-01',
    chapterTitle: 'Main Ideas, Details, and Evidence',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-01-section-4',
    sectionHeading: 'Classroom connection',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),

  // Chapter 2: Inference and Vocabulary in Context
  makeEntry({
    id: 'parapro-gloss-03',
    term: 'Evidence-based inference',
    definition:
      'Logical conclusion formed by pairing explicit textual clues with prior knowledge while verifying that every part of the conclusion is anchored in passage evidence rather than speculation.',
    aliases: ['Text-supported inference'],
    chapterId: 'parapro-ch-02',
    chapterTitle: 'Inference and Vocabulary in Context',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-02-section-1',
    sectionHeading: 'Evidence-based inference',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),
  makeEntry({
    id: 'parapro-gloss-04',
    term: 'Context clues and morphology',
    definition:
      'Strategy for determining unfamiliar word meanings by combining surrounding sentence signals, such as definitions or contrasts, with analysis of prefixes, roots, and suffixes during reading support.',
    aliases: ['Word-part analysis'],
    chapterId: 'parapro-ch-02',
    chapterTitle: 'Inference and Vocabulary in Context',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-02-section-3',
    sectionHeading: 'Context and word parts',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),

  // Chapter 3: Text Structure, Features, and Sources
  makeEntry({
    id: 'parapro-gloss-05',
    term: 'Text structure',
    definition:
      'Framework an author uses to organize ideas, such as sequence, cause and effect, comparison, or problem and solution, signaled by transition words that support student comprehension.',
    aliases: ['Organizational pattern'],
    chapterId: 'parapro-ch-03',
    chapterTitle: 'Text Structure, Features, and Sources',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-03-section-1',
    sectionHeading: 'Organizational patterns',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),
  makeEntry({
    id: 'parapro-gloss-06',
    term: 'Primary versus secondary source',
    definition:
      'Distinction between firsthand records created during an event and later analyses or summaries, helping students compare viewpoints, purpose, and reliability across informational texts.',
    aliases: ['Source type distinction'],
    chapterId: 'parapro-ch-03',
    chapterTitle: 'Text Structure, Features, and Sources',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-03-section-3',
    sectionHeading: 'Comparing sources',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),

  // Chapter 4: Supporting Reading in the Classroom
  makeEntry({
    id: 'parapro-gloss-07',
    term: 'Decoding versus comprehension',
    definition:
      'Distinguishing word-recognition barriers in phonemic awareness and phonics from fluency or language-comprehension gaps so teacher-directed support addresses the student\'s actual reading need.',
    aliases: ['Reading barrier identification'],
    chapterId: 'parapro-ch-04',
    chapterTitle: 'Supporting Reading in the Classroom',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-04-section-1',
    sectionHeading: 'Identify the actual barrier',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),
  makeEntry({
    id: 'parapro-gloss-08',
    term: 'Instructional support boundary',
    definition:
      'Paraprofessional scope of reinforcing teacher-planned lessons, fading prompts toward student independence, and sharing observations rather than independently diagnosing or redesigning instruction.',
    aliases: ['Teacher-directed supervision'],
    chapterId: 'parapro-ch-04',
    chapterTitle: 'Supporting Reading in the Classroom',
    domainId: 'reading',
    domainLabel: 'Reading',
    sectionId: 'parapro-ch-04-section-4',
    sectionHeading: 'Feedback and independence',
    references: [PARAPRO_ETS, PARAPRO_WWC_READING],
  }),

  // Chapter 5: Numbers, Fractions, Decimals, and Percents
  makeEntry({
    id: 'parapro-gloss-09',
    term: 'Place value',
    definition:
      'Numerical value assigned to a digit by its position in a base-ten numeral, where each place represents ten times the place to its right and anchors regrouping, decimals, and rounding.',
    aliases: ['Base-ten positional value'],
    chapterId: 'parapro-ch-05',
    chapterTitle: 'Numbers, Fractions, Decimals, and Percents',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-05-section-1',
    sectionHeading: 'Place value and signed numbers',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),
  makeEntry({
    id: 'parapro-gloss-10',
    term: 'Equivalent fractions',
    definition:
      'Different fraction forms representing the same quantity, generated by multiplying or dividing both numerator and denominator by the same nonzero factor to compare, add, or subtract fractions.',
    aliases: ['Common-denominator scaling'],
    chapterId: 'parapro-ch-05',
    chapterTitle: 'Numbers, Fractions, Decimals, and Percents',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-05-section-2',
    sectionHeading: 'Fraction meaning and operations',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),

  // Chapter 6: Ratios, Proportions, Expressions, and Equations
  makeEntry({
    id: 'parapro-gloss-11',
    term: 'Proportional ratio',
    definition:
      'Multiplicative comparison of two quantities that preserves a constant unit rate when both terms are scaled by the same nonzero factor, separating multiplicative from additive reasoning.',
    aliases: ['Equivalent ratio'],
    chapterId: 'parapro-ch-06',
    chapterTitle: 'Ratios, Proportions, Expressions, and Equations',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-06-section-1',
    sectionHeading: 'Ratios and unit rates',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),
  makeEntry({
    id: 'parapro-gloss-12',
    term: 'Inverse operations',
    definition:
      'Paired mathematical operations that undo one another, such as addition with subtraction and multiplication with division, applied identically to both sides of an equation to isolate an unknown.',
    aliases: ['Equation balancing'],
    chapterId: 'parapro-ch-06',
    chapterTitle: 'Ratios, Proportions, Expressions, and Equations',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-06-section-3',
    sectionHeading: 'Equations as balance',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),

  // Chapter 7: Geometry and Measurement
  makeEntry({
    id: 'parapro-gloss-13',
    term: 'Perimeter, area, and volume',
    definition:
      'Distinct geometric measures representing boundary length in linear units, interior surface coverage in square units, and three-dimensional space in cubic units to prevent formula mix-ups.',
    aliases: ['Dimensional measurement'],
    chapterId: 'parapro-ch-07',
    chapterTitle: 'Geometry and Measurement',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-07-section-1',
    sectionHeading: 'What is being measured?',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),
  makeEntry({
    id: 'parapro-gloss-14',
    term: 'Coordinate plane',
    definition:
      'Two-dimensional grid formed by perpendicular horizontal (x) and vertical (y) axes meeting at the origin, locating every point uniquely with an ordered pair (x, y) across four quadrants.',
    aliases: ['Cartesian plane'],
    chapterId: 'parapro-ch-07',
    chapterTitle: 'Geometry and Measurement',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-07-section-3',
    sectionHeading: 'Angles and coordinates',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),

  // Chapter 8: Data, Probability, and Supporting Mathematics
  makeEntry({
    id: 'parapro-gloss-15',
    term: 'Measures of central tendency',
    definition:
      'Summary statistics describing the center of a data set: the arithmetic average (mean), middle ordered value (median), and most frequent value (mode), interpreted alongside outliers and spread.',
    aliases: ['Mean, median, and mode'],
    chapterId: 'parapro-ch-08',
    chapterTitle: 'Data, Probability, and Supporting Mathematics',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-08-section-2',
    sectionHeading: 'Center and variability',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),
  makeEntry({
    id: 'parapro-gloss-16',
    term: 'Mathematical error analysis',
    definition:
      'Reviewing a student\'s written work and visual models to pinpoint a specific misconception, such as misaligning place values or adding denominators, before offering a targeted prompt.',
    aliases: ['Diagnostic error review'],
    chapterId: 'parapro-ch-08',
    chapterTitle: 'Data, Probability, and Supporting Mathematics',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'parapro-ch-08-section-4',
    sectionHeading: 'Instruction through representations',
    references: [PARAPRO_ETS, PARAPRO_PREALGEBRA],
  }),

  // Chapter 9: Grammar, Usage, and Mechanics
  makeEntry({
    id: 'parapro-gloss-17',
    term: 'Sentence fragment',
    definition:
      'Group of words punctuated as a sentence that lacks a subject, a complete verb, or an independent clause, requiring connection to a main clause or addition of missing grammatical elements.',
    aliases: ['Incomplete clause'],
    chapterId: 'parapro-ch-09',
    chapterTitle: 'Grammar, Usage, and Mechanics',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-09-section-1',
    sectionHeading: 'Sentence foundations',
    references: [PARAPRO_ETS, PARAPRO_WRITING_HANDBOOK],
  }),
  makeEntry({
    id: 'parapro-gloss-18',
    term: 'Subject-verb agreement',
    definition:
      'Standard usage principle requiring a verb to match its grammatical subject in number and person, ignoring intervening prepositional phrases and checking compound or indefinite subjects carefully.',
    aliases: ['Grammatical agreement'],
    chapterId: 'parapro-ch-09',
    chapterTitle: 'Grammar, Usage, and Mechanics',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-09-section-2',
    sectionHeading: 'Agreement and reference',
    references: [PARAPRO_ETS, PARAPRO_WRITING_HANDBOOK],
  }),

  // Chapter 10: Sentence Revision and Clarity
  makeEntry({
    id: 'parapro-gloss-19',
    term: 'Sentence combining',
    definition:
      'Merging choppy or repetitive sentences through coordination or subordination to express logical relationships, such as cause, contrast, or sequence, while preserving the writer\'s meaning.',
    aliases: ['Syntactic revision'],
    chapterId: 'parapro-ch-10',
    chapterTitle: 'Sentence Revision and Clarity',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-10-section-1',
    sectionHeading: 'Revision versus correction',
    references: [PARAPRO_ETS, PARAPRO_WRITING_HANDBOOK],
  }),
  makeEntry({
    id: 'parapro-gloss-20',
    term: 'Active voice',
    definition:
      'Clause structure in which the grammatical subject performs the verb\'s action rather than receiving it, generally improving clarity, directness, and concision during classroom writing revision.',
    aliases: ['Direct subject-action phrasing'],
    chapterId: 'parapro-ch-10',
    chapterTitle: 'Sentence Revision and Clarity',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-10-section-2',
    sectionHeading: 'Clarity and concision',
    references: [PARAPRO_ETS, PARAPRO_WRITING_PROCESS],
  }),

  // Chapter 11: Organization, Argument, and Evidence
  makeEntry({
    id: 'parapro-gloss-21',
    term: 'Topic sentence',
    definition:
      'Focal sentence announcing a paragraph\'s controlling idea so every supporting detail, example, and transition contributes coherently to the document\'s overall organization.',
    aliases: ['Paragraph controlling sentence'],
    chapterId: 'parapro-ch-11',
    chapterTitle: 'Organization, Argument, and Evidence',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-11-section-1',
    sectionHeading: 'Paragraph coherence',
    references: [PARAPRO_ETS, PARAPRO_WRITING_PROCESS],
  }),
  makeEntry({
    id: 'parapro-gloss-22',
    term: 'Claim-evidence-reasoning',
    definition:
      'Argument framework connecting a clear assertion (claim) with relevant facts or textual details (evidence) and explicit explanation (reasoning) showing why that evidence proves the claim.',
    aliases: ['CER framework'],
    chapterId: 'parapro-ch-11',
    chapterTitle: 'Organization, Argument, and Evidence',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-11-section-2',
    sectionHeading: 'Claim, evidence, reasoning',
    references: [PARAPRO_ETS, PARAPRO_WRITING_PROCESS],
  }),

  // Chapter 12: Supporting Writing in the Classroom
  makeEntry({
    id: 'parapro-gloss-23',
    term: 'Revision versus editing',
    definition:
      'Distinguishing higher-order revision of ideas, evidence, and organization from surface-level editing of spelling, punctuation, and grammar so classroom support fits the student\'s current stage.',
    aliases: ['Writing-stage differentiation'],
    chapterId: 'parapro-ch-12',
    chapterTitle: 'Supporting Writing in the Classroom',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-12-section-1',
    sectionHeading: 'Match support to the writing stage',
    references: [PARAPRO_ETS, PARAPRO_WRITING_PROCESS],
  }),
  makeEntry({
    id: 'parapro-gloss-24',
    term: 'Student authorship preservation',
    definition:
      'Providing targeted prompts, think-aloud models, and sentence frames so students revise their own drafts rather than having adults rewrite text for them, honoring teacher-directed boundaries.',
    aliases: ['Authorship boundary'],
    chapterId: 'parapro-ch-12',
    chapterTitle: 'Supporting Writing in the Classroom',
    domainId: 'writing',
    domainLabel: 'Writing',
    sectionId: 'parapro-ch-12-section-3',
    sectionHeading: 'Specific feedback and authorship',
    references: [PARAPRO_ETS, PARAPRO_WRITING_PROCESS],
  }),
];

module.exports = {
  praxis_core_5752,
  parapro,
};
