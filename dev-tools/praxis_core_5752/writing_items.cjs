'use strict';

const { WRITING, CORE_PAGE, CCSS_ELA } = require('./sources.cjs');
const { q } = require('./item_helpers.cjs');
const refs = [WRITING, CORE_PAGE, CCSS_ELA];

const productionRevision = [
  q(
    'A draft argues that a city should add shaded bus stops. Which thesis is most focused and defensible?',
    'A draft argues that a college should extend library hours. Which thesis most clearly establishes a supportable position?',
    'The city should prioritize shade at its busiest stops because heat exposure and long waits create a documented barrier.',
    [
      'Municipal transit systems across the country operate many different types of bus stops and commuter shelters each day.',
      'Adding overhead shade structures at public transit stops improves urban life across every neighborhood without drawbacks.',
      'This essay will examine several broad issues related to city transportation planning, summer weather, and commuter habits.',
    ],
    'A strong argumentative thesis states a specific claim, a reason, and a manageable scope that the essay can support with relevant evidence.',
    [
      'This statement merely offers a neutral background fact about transit systems rather than advancing a debatable policy claim with supporting reasoning.',
      'Making a sweeping claim without boundaries or tradeoffs overstates what evidence can defend and ignores cost, siting, or maintenance priorities.',
      'Announcing a broad topic area tells readers what subject the draft touches on, yet leaves out an arguable position and concrete rationale.',
    ],
    {
      variantB: {
        correct: 'The college should add late-evening library hours during midterms and finals because commuters lack quiet study space.',
        distractors: [
          'Academic libraries on college campuses provide books, research databases, group tables, and computer terminals for students.',
          'Keeping the campus library open around the clock every day of the calendar year solves every student retention challenge.',
          'This essay will discuss campus library schedules, student study preferences, and building operations during the academic term.',
        ],
        rationale: 'A strong argumentative thesis states a targeted scheduling recommendation, a concrete student need, and a realistic scope that campus usage data can support.',
        distractorNotes: [
          'Listing ordinary library services states factual background information rather than taking a debatable position about extending operating hours.',
          'Claiming round-the-clock hours resolve every retention challenge exaggerates the scope beyond what scheduling evidence can reasonably establish.',
          'Announcing general topics the essay will touch on describes the subject matter without committing to a clear, defensible claim or reason.',
        ],
      },
    },
  ),
  q(
    'A paragraph begins with survey results showing that students want more evening advising, then jumps to the history of the campus seal. Which revision best improves unity?',
    'A paragraph explains three causes of food waste, then includes a sentence describing the cafeteria wall color. Which revision best improves coherence?',
    'Remove the unrelated sentence or move it to a separate section where it serves a clear purpose.',
    [
      'Expand the unrelated detail with two additional background sentences so that it feels more balanced in length.',
      'Move the unrelated sentence to the beginning of the paragraph so readers encounter the extra fact right away.',
      'Repeat the unrelated detail in the concluding sentence to make the ending echo the middle of the paragraph.',
    ],
    'Paragraph unity requires each sentence to develop the controlling idea; irrelevant material should be removed or deliberately relocated.',
    [
      'Adding more sentences to an off-topic point deepens the digression instead of focusing the paragraph on its central argument.',
      'Placing an irrelevant detail at the opening position disrupts the topic sentence and misleads readers about the paragraph focus.',
      'Echoing an unrelated observation in the conclusion reinforces a stray tangent rather than tying evidence back to the main claim.',
    ],
  ),
  q(
    'Which transition best completes this reasoning? "The pilot reduced processing time. ____, it did not include the most complex applications, so further testing is needed."',
    'Which transition best connects these ideas? "The route carried more riders. ____, the evaluation covered only one month and cannot show a seasonal trend."',
    'However',
    ['For example', 'Similarly', 'Therefore'],
    'However signals the necessary contrast between a favorable result and a limitation that qualifies its interpretation.',
    [
      'Using an illustration marker implies the second sentence supplies a concrete case of the first claim rather than introducing an important caveat.',
      'Using a comparison marker suggests the two sentences point in the same supportive direction instead of contrasting a gain with a limitation.',
      'Using a cause-and-effect marker treats the scope limitation as a logical result of the favorable outcome rather than a qualification on it.',
    ],
  ),
  q(
    'A writer has evidence about cost, user access, and maintenance for two software options. Which organization best supports a comparison?',
    'A report compares two scheduling plans on staffing, wait time, and equity. Which structure makes the comparison easiest to evaluate?',
    'Apply the same criteria in the same order to both options, then synthesize the tradeoffs.',
    [
      'Focus thoroughly on the writer\'s preferred option and leave the competing option to a brief footnote.',
      'Discuss criteria in whatever order the notes appear so each paragraph covers a mixed set of points.',
      'State the final recommendation first and omit the criteria definitions so readers move quickly to the end.',
    ],
    'Parallel organization lets readers compare like with like and supports a synthesis grounded in consistently applied criteria.',
    [
      'Minimizing the second option prevents readers from weighing concrete tradeoffs across shared benchmarks and weakens credibility.',
      'Scrambling criteria across paragraphs forces readers to hunt for matching data points and obscures how the two alternatives compare.',
      'Skipping criteria definitions and side-by-side evidence leaves the recommendation unsupported and difficult for readers to verify.',
    ],
  ),
  q(
    'Which revision is most concise without losing meaning? "Due to the fact that the meeting was postponed, the committee met at a later point in time."',
    'Which revision removes unnecessary wording? "At this point in time, the team is currently reviewing each and every application."',
    'Because the meeting was postponed, the committee met later.',
    [
      'The meeting, due to the fact of its postponement, occurred at a subsequent point in time.',
      'The committee met later on account of a postponement that postponed the scheduled meeting.',
      'It was due to the fact that the meeting was postponed that the committee later convened.',
    ],
    'The revision preserves the causal meaning while replacing inflated phrases and redundant wording with direct language.',
    [
      'Keeping wordy phrases like due to the fact and subsequent point in time retains the exact bloat the revision is meant to cut.',
      'Using both postponement and postponed repeats the same root idea unnecessarily while adding extra prepositional clutter.',
      'Wrapping the sentence in an expletive construction (It was due to the fact that) adds empty filler without sharpening meaning.',
    ],
    {
      variantB: {
        correct: 'The team is currently reviewing every application.',
        distractors: [
          'At the present point in time, the team is currently reviewing each and every submitted application.',
          'Each and every single application is at this point in time currently under review by the team.',
          'Currently at this point in time, the team reviews each application one by one without exception.',
        ],
        rationale: 'Replacing "At this point in time" and "each and every" eliminates redundant time and quantifier phrases while keeping the exact meaning.',
        distractorNotes: [
          'Substituting present point in time alongside currently and each and every preserves both redundancies from the original draft.',
          'Shifting to passive voice while keeping each and every single and at this point in time makes the sentence heavier rather than tighter.',
          'Combining currently with at this point in time repeats the time reference and adds extra phrasing not needed for clarity.',
        ],
      },
    },
  ),
  q(
    'A source-based paragraph quotes one source and then summarizes a second. What should the writer do to make the relationship clear?',
    'A synthesis paragraph uses findings from two reports that reach different conclusions. Which revision is strongest?',
    'Attribute each source, explain where their evidence agrees or diverges, and tie that link to the claim.',
    [
      'Place the quotation and summary next to each other so readers can draw their own connections without commentary.',
      'Note in the topic sentence that multiple reports exist on the issue while omitting specific attributions inside the body.',
      'Restate each report\'s final sentence in order without explaining how the two findings bear on the paragraph point.',
    ],
    'Synthesis requires attribution plus explanation of the relationship among sources and the writer\'s controlling idea.',
    [
      'Dropping source material side by side without transition or commentary leaves readers guessing why the sources matter to the argument.',
      'A vague mention that multiple reports exist hides which claim comes from which source and breaks academic accountability.',
      'Stacking two unanalyzed conclusions produces a list of summaries instead of genuine synthesis linked to the writer\'s thesis.',
    ],
  ),
  q(
    'A conclusion simply repeats the thesis word for word. Which revision would most strengthen it?',
    'A final paragraph lists every earlier sentence again. Which change would create a more effective conclusion?',
    'Synthesize the core reasoning, highlight its broader implication, and close within the essay\'s evidence.',
    [
      'Introduce an entirely new policy argument in the final lines to give readers an extra topic to consider.',
      'Restate the opening hook and thesis verbatim twice so the audience remembers the original phrasing.',
      'Close by noting several related questions the draft lacked space to examine or support with evidence.',
    ],
    'An effective conclusion integrates rather than mechanically repeats the argument and stays within the evidence already developed.',
    [
      'Raising an undeveloped major claim at the very end leaves it unsupported and disrupts the cohesion of the finished argument.',
      'Mechanical verbatim repetition adds length without deepening the reader\'s grasp of why the accumulated evidence matters.',
      'Ending on apologies or unaddressed gaps undercuts the essay\'s authority instead of consolidating what the evidence showed.',
    ],
  ),
  q(
    'A draft for educated adults uses sarcastic labels for people who disagree. Which revision best improves rhetorical effectiveness?',
    'A policy memo calls opponents foolish instead of answering their evidence. Which revision is most appropriate?',
    'State the competing view accurately and address its reasoning with relevant evidence in a measured tone.',
    [
      'Sharpen the sarcastic descriptions with stronger adjectives so the writer\'s conviction feels unmistakable.',
      'Omit any acknowledgment of opposing perspectives so readers see only one side of the policy debate.',
      'Add emphatic punctuation and bold warnings to signal confidence while keeping the original personal labels.',
    ],
    'Accurate representation and evidence-based response strengthen credibility and reasoning; personal attacks do not address the argument.',
    [
      'Escalating ad hominem attacks alienates fair-minded readers and still leaves the opposing side\'s actual evidence unanswered.',
      'Ignoring credible counterarguments makes a policy memo appear one-sided and unprepared for foreseeable objections from informed stakeholders.',
      'Emphatic formatting cannot substitute for substance; keeping insulting labels continues to undermine ethos and professional tone.',
    ],
  ),
];

const languageUsage = [
  q(
    'Which sentence uses subject-verb agreement correctly?',
    'Which sentence maintains correct agreement?',
    'The collection of field notes is stored in the archive.',
    [
      'The collection of field notes are stored in the archive.',
      'The field notes collection are stored in the archive.',
      'The collection, along with its labels, are stored in the archive.',
    ],
    'The singular head noun collection controls the verb; intervening plural nouns and an along-with phrase do not change that agreement.',
    [
      'The plural object of the preposition (field notes) is mistaken for the subject, causing the plural verb to disagree with singular collection.',
      'Here field notes modifies the singular head noun collection, so the plural verb still clashes with the singular subject.',
      'Parenthetical phrases introduced by along with do not create a compound plural subject, so the verb must remain singular.',
    ],
  ),
  q(
    'Which sentence uses pronouns clearly and consistently?',
    'Which revision removes the ambiguous pronoun?',
    'When Lena spoke with Priya, Lena clarified that the grant deadline had changed.',
    [
      'When Lena spoke with Priya, she clarified that the grant deadline had changed.',
      'Lena told Priya that she changed the grant deadline, which seemed clear enough.',
      'They discussed the grant update because she already knew what that change meant.',
    ],
    'Repeating the needed noun may be less compact, but it removes uncertainty about who clarified what.',
    [
      'Because both Lena and Priya are named in the opening clause, the pronoun she could refer to either person and creates ambiguity.',
      'Both she and the broad pronoun which lack clear single antecedents, leaving readers unsure who altered the deadline and what was clear.',
      'Using they, she, and that without matching named antecedents leaves readers unable to identify who spoke or what update is meant.',
    ],
  ),
  q(
    'Which sentence correctly uses a comma after an introductory clause?',
    'Which sentence is punctuated correctly?',
    'Although the forecast predicted rain, the outdoor workshop continued.',
    [
      'Although the forecast predicted rain the outdoor workshop continued.',
      'Although, the forecast predicted rain the outdoor workshop continued.',
      'Although the forecast, predicted rain the outdoor workshop continued.',
    ],
    'A dependent introductory clause is separated from the independent clause that follows with a comma.',
    [
      'Omitting the comma after the introductory dependent clause causes the two clauses to run together without a structural boundary.',
      'Placing a comma directly after the subordinating conjunction Although breaks the conjunction away from its own clause.',
      'Inserting a comma between the subject (the forecast) and its verb (predicted) splits a single clause incorrectly.',
    ],
  ),
  q(
    'Which sentence avoids a comma splice?',
    'Which revision correctly joins the independent clauses?',
    'The sample was small, so the researchers described the findings as preliminary.',
    [
      'The sample was small, the researchers described the findings as preliminary.',
      'The sample was small, describing the findings as preliminary for readers.',
      'The sample was small so, the researchers described the findings as preliminary.',
    ],
    'The coordinating conjunction so, preceded by a comma, correctly joins two independent clauses and expresses the relationship.',
    [
      'Joining two complete independent clauses with only a comma creates a comma splice rather than a valid compound sentence.',
      'Replacing the second clause with a participial phrase attaches describing illogically to the inanimate subject sample.',
      'Putting the comma after the coordinating conjunction so instead of before it misplaces the clause boundary punctuation.',
    ],
  ),
  q(
    'Which revision fixes the misplaced modifier? "Walking through the gallery, the new exhibit impressed Mateo."',
    'Which revision fixes the dangling modifier? "After reviewing the data, the trend became clear to Imani."',
    'Walking through the gallery, Mateo was impressed by the new exhibit.',
    [
      'Walking through the gallery, the new exhibit looked very impressive to Mateo.',
      'The new exhibit, walking through the gallery, immediately impressed Mateo.',
      'Mateo, the gallery walking through, found the new exhibit very impressive.',
    ],
    'The introductory modifier must logically describe the grammatical subject that immediately follows it.',
    [
      'This revision keeps the new exhibit as the subject right after the modifier, still implying that the exhibit itself was walking.',
      'Placing the participial phrase directly after the new exhibit still modifies the inanimate exhibit rather than Mateo.',
      'Turning the modifier into an ungrammatical phrase (the gallery walking through) breaks standard English syntax and clarity.',
    ],
    {
      variantB: {
        correct: 'After reviewing the data, Imani noticed the trend clearly.',
        distractors: [
          'After reviewing the data, the clear trend stood out immediately to Imani.',
          'The trend, after reviewing the data, became unmistakable to Imani.',
          'After reviewing the data, it became clear to Imani that a trend existed.',
        ],
        rationale: 'Placing Imani immediately after the introductory participial phrase ensures the grammatical subject is the person who reviewed the data.',
        distractorNotes: [
          'Keeping the clear trend as the main-clause subject still makes the sentence say that the trend itself reviewed the data.',
          'Inserting the modifying phrase right after the trend continues to attach the action of reviewing to the trend instead of Imani.',
          'Using the dummy pronoun it as the subject leaves the introductory phrase dangling with no clear human agent reviewing the data.',
        ],
      },
    },
  ),
  q(
    'Which sentence uses parallel structure?',
    'Which sentence presents a parallel series?',
    'The internship requires collecting data, analyzing results, and presenting findings.',
    [
      'The internship requires collecting data, analysis of results, and to present findings.',
      'The internship requires data collection, analyzing results, and findings are presented.',
      'The internship requires to collect data, results analysis, and presenting findings.',
    ],
    'All three coordinated elements use the same gerund form, making their grammatical roles clear and balanced.',
    [
      'Mixing a gerund phrase (collecting), a noun phrase (analysis of), and an infinitive (to present) breaks grammatical parallelism.',
      'Switching from a noun phrase to a gerund and then to a full passive clause (findings are presented) disrupts series balance.',
      'Pairing an infinitive (to collect) with a noun phrase and a gerund fails to match the verb forms across the coordinated list.',
    ],
  ),
  q(
    'Which sentence uses the apostrophe correctly?',
    'Which sentence correctly indicates plural possession?',
    'The two committees\' recommendations were combined in one report.',
    [
      'The two committee\'s recommendations were combined in one report.',
      'The two committees recommendation\'s were combined in one report.',
      'The two committee\'s\' recommendations were combined in one report.',
    ],
    'Because committees is a regular plural ending in s, its possessive form adds an apostrophe after the s.',
    [
      'Putting the apostrophe before the s forms the singular possessive, which clashes with the plural modifier two.',
      'Attaching the apostrophe to recommendations marks the wrong noun as possessive and drops the plural possessive on committees.',
      'Using two apostrophes around the s is nonstandard punctuation; regular plurals ending in s take a single final apostrophe.',
    ],
  ),
  q(
    'Which sentence maintains a consistent verb tense?',
    'Which sentence uses tense consistently for completed events?',
    'The team reviewed the records, identified the error, and issued a correction.',
    [
      'The team reviewed the records, identifies the error, and issued a correction.',
      'The team reviews the records, identified the error, and will issue a correction yesterday.',
      'The team had reviewed the records and identifies the error before issuing a correction.',
    ],
    'A sequence of completed past actions is expressed consistently with parallel past-tense verbs.',
    [
      'Shifting abruptly into present tense (identifies) in the middle of two past-tense verbs breaks temporal consistency.',
      'Mixing present, past, and future tense alongside the past time marker yesterday creates an impossible timeline.',
      'Pairing past perfect (had reviewed) with present tense (identifies) shifts timeframes unnecessarily for completed past steps.',
    ],
  ),
  q(
    'Which word best completes the sentence? "The new evidence did not contradict the earlier finding; rather, it ____ its scope."',
    'Which word most precisely completes the sentence? "The follow-up study did not erase the original result; it ____ the conditions under which it applied."',
    'qualified',
    ['celebrated', 'transported', 'replicated'],
    'Qualified precisely means limited or specified the reach of a claim, which matches the contrast in the sentence.',
    [
      'Saying evidence celebrated a scope or conditions introduces an emotional human action that does not fit scientific precision.',
      'Transported denotes physical movement from one place to another rather than narrowing or specifying the reach of a finding.',
      'Replicated means repeated a study to obtain matching results, whereas the contrast calls for bounding or refining the conditions.',
    ],
  ),
  q(
    'Which sentence correctly uses a semicolon?',
    'Which option correctly links two closely related independent clauses?',
    'The first trial measured speed; the second measured accuracy.',
    [
      'The first trial; measured speed, and the second measured accuracy.',
      'The first trial measured; speed, while the second measured accuracy.',
      'The first; trial measured speed and the second measured accuracy.',
    ],
    'A semicolon may join two closely related independent clauses when no coordinating conjunction is used.',
    [
      'Placing a semicolon directly after the subject (The first trial) separates a subject from its predicate verb illegally.',
      'Putting a semicolon between the transitive verb (measured) and its direct object (speed) breaks a single clause apart.',
      'Splitting the modifier first from the noun trial with a semicolon interrupts a single noun phrase instead of linking clauses.',
    ],
  ),
];

const researchSkills = [
  q(
    'A writer needs current statewide graduation totals. Which source is most appropriate as the starting point?',
    'A researcher needs the current text of a municipal ordinance. Which source should be checked first?',
    'The responsible government agency\'s current official release or record, including definitions and revision date.',
    [
      'An undated commercial summary page that highlights headline numbers without linking to the underlying agency data.',
      'A personal blog post describing one local resident\'s experience and recollection of the recent policy or school year.',
      'A search-engine preview snippet showing two quoted lines without opening the host page, date, or full text.',
    ],
    'The authoritative primary source is best for current official totals or legal text, while definitions and dates help verify scope and currency.',
    [
      'Undated commercial summaries lack verifiable currency and often strip out essential definitions, exceptions, or recent revisions.',
      'Anecdotal personal posts reflect one individual\'s perspective rather than comprehensive official statistics or enacted statutory text.',
      'Search snippets truncate context and omit revision dates or amendments, making them unreliable for authoritative verification.',
    ],
  ),
  q(
    'Which information is essential when evaluating a study cited in an essay?',
    'Which evidence most helps a writer judge whether survey findings support a broad claim?',
    'The research question, sampling method, measures, comparison, limitations, and potential conflicts.',
    [
      'The visual formatting of the publication, including typography, page layout, and chart color scheme.',
      'Whether the reported conclusion aligns smoothly with the writer\'s preexisting thesis and viewpoint.',
      'The overall page count of the report and the total number of subheadings used in the executive summary.',
    ],
    'Credibility and applicability depend on how evidence was produced, analyzed, bounded, and potentially influenced.',
    [
      'Clean graphic design and typography reflect production polish, not methodological rigor, sample quality, or analytical validity.',
      'Judging evidence by agreement with a prior belief introduces confirmation bias instead of testing whether the claim is warranted.',
      'Overall document length and heading layout tell nothing about sample representativeness, measurement quality, or core study limits.',
    ],
  ),
  q(
    'A paragraph closely paraphrases a source\'s distinctive reasoning. What is required?',
    'A writer restates a report\'s analysis entirely in new words. What should the writer do?',
    'Use genuinely independent wording and structure while clearly citing the source of the idea.',
    [
      'Swap several key synonyms in the original sentences and omit the citation because the wording changed.',
      'Place quotation marks around the writer\'s own paraphrased sentences while omitting the author\'s name.',
      'Omit attribution whenever a published analysis is rewritten smoothly because ideas become common knowledge.',
    ],
    'Paraphrasing changes expression, not intellectual ownership; both authentic rewording and attribution are needed.',
    [
      'Patchwriting with swapped synonyms remains too close to the original syntax and omits credit for the source\'s intellectual work.',
      'Quotation marks belong exclusively around verbatim borrowed language, and they never substitute for naming the actual source.',
      'Distinctive arguments and analyses remain attributable to their creators even when restated completely in original wording.',
    ],
  ),
  q(
    'A website claims a supplement improves memory but sells the product and links no study. How should a writer use it?',
    'An advocacy page makes a statistical claim without naming its dataset or method. What is the best next step?',
    'Treat the unsupported claim cautiously and locate independent underlying evidence before relying on it.',
    [
      'Cite the page as authoritative proof because its polished layout and confident claims look professional.',
      'Repeat the claim across several paragraphs alongside other promotional pages to strengthen its credibility.',
      'Dismiss the commercial or advocacy connection as irrelevant because financial motives do not affect claims.',
    ],
    'A relevant conflict and missing evidence do not automatically make a claim false, but they require verification from traceable sources.',
    [
      'Surface design polish and confident rhetoric cannot replace traceable methodology, peer-reviewed data, or verifiable independent empirical support.',
      'Repeating an unverified claim or citing additional promotional pages multiplies the same unsupported assertion without adding proof.',
      'Commercial and advocacy incentives create foreseeable bias risks that require checking independent, transparent primary research evidence.',
    ],
  ),
  q(
    'Which note-taking practice best reduces accidental plagiarism?',
    'Which research workflow best preserves source boundaries during drafting?',
    'Log full citation details and page numbers while clearly marking quotations, paraphrases, and your own notes.',
    [
      'Paste excerpts from multiple sources into one running document without labels so drafting flows quickly.',
      'Wait until the final proofread to match copied phrases back to their original authors and page numbers.',
      'Strip quotation marks from copied passages during early note-taking so every sentence blends smoothly.',
    ],
    'Clear source metadata and labeling preserve provenance and make accurate citation and paraphrase possible.',
    [
      'Mixing unlabeled excerpts from multiple works makes it nearly impossible during drafting to tell borrowed text from original thought.',
      'Trying to reconstruct citations from memory at the end invites missed attributions, wrong page numbers, and unquoted borrowing.',
      'Removing quotation marks from verbatim notes directly causes accidental plagiarism when those sentences enter the final draft.',
    ],
  ),
  q(
    'Two credible sources report different unemployment rates for the same region. What should a writer check first?',
    'Two official dashboards show different enrollment totals. Which comparison is most useful?',
    'Definitions, target population, time period, data revisions, and measurement methods.',
    [
      'Which reported figure fits more smoothly with the writer\'s preferred argument and opening claim.',
      'Which dashboard presents the numbers with cleaner charts, brighter colors, and larger summary cards.',
      'Whether the two agencies rounded their reported totals to the same number of decimal places.',
    ],
    'Apparent disagreement often comes from different constructs, populations, dates, or revisions; those must be aligned before interpreting the figures.',
    [
      'Cherry-picking whichever reported figure favors an opening thesis conceals genuine methodological differences and distorts the available evidence.',
      'Visual presentation has no bearing on why two official counts diverge; substantive definitions and collection windows do.',
      'Minor rounding differences rarely explain major discrepancies across agencies compared with differing target populations, dates, or definitions.',
    ],
  ),
  q(
    'A writer cites a chart reproduced in a report, but the chart names an original dataset. Which research step is strongest?',
    'A news article summarizes a public study. What should a writer do before making a detailed methodological claim?',
    'Locate and inspect the original dataset or study when available, then cite the source actually supporting the claim.',
    [
      'Rely exclusively on the secondary summary without checking how the original authors framed their methods.',
      'Assume every secondary reproduction preserves the exact variable labels, sample caveats, and statistical scope.',
      'Remove references to the original dataset so readers focus cleanly on the secondary report\'s interpretation.',
    ],
    'Following evidence to its primary source improves accuracy about methods, definitions, and limitations and supports precise attribution.',
    [
      'Secondary summaries frequently simplify methods or omit key caveats, risking inaccurate claims if cited without verification.',
      'Reproduced charts and articles can alter scales, omit footnotes, or generalize beyond the primary study\'s actual boundaries.',
      'Hiding the underlying dataset obscures provenance and prevents readers from verifying the original evidence behind the claim.',
    ],
  ),
  q(
    'Which research question is sufficiently focused for a short evidence-based essay?',
    'Which question gives a manageable scope for a brief source-based paper?',
    'How did the city\'s 2024 bus-frequency pilot affect weekday wait times on the two participating routes?',
    [
      'What are the main features and historical milestones of public transportation systems around the world?',
      'How have major cities across every continent solved urban traffic congestion and commuter mobility challenges?',
      'Are municipal public bus networks generally beneficial or problematic for modern communities and local economies?',
    ],
    'The focused question specifies intervention, outcome, time, and population, making relevant evidence and a bounded analysis possible.',
    [
      'Surveying global transit history is far too sweeping for a brief essay and invites superficial summary rather than evidence-based analysis.',
      'Covering every continent and every mobility challenge sets an unmanageable scope with no bounded dataset or testable outcome.',
      'Asking a broad yes-or-no value question without a defined case, metric, or timeframe lacks the precision needed for focused research.',
    ],
  ),
];

module.exports = [
  { id: 'writing-production-revision', chapterId: 'core5752-ch-04', domainId: 'writing-text-types-production', domain: 'Writing: Text Types, Purposes, and Production', label: 'Argument, Organization, Revision, and Synthesis', references: refs, questions: productionRevision },
  { id: 'writing-language-usage', chapterId: 'core5752-ch-05', domainId: 'writing-language-research', domain: 'Writing: Language and Research Skills', label: 'Usage, Sentences, Mechanics, and Word Choice', references: refs, questions: languageUsage },
  { id: 'writing-research-sources', chapterId: 'core5752-ch-06', domainId: 'writing-language-research', domain: 'Writing: Language and Research Skills', label: 'Research Strategy, Credibility, Citation, and Synthesis', references: refs, questions: researchSkills },
];
