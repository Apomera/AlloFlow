'use strict';

// AP U.S. Government foundation pilot: targeted key-stem lexical leakage fixes
// for all 61 leaking items. Modifies only `answer` or `prompt` (never
// `distractorReplacements`) so all distractor feedback keys stay 100% matched.

module.exports = {
  'ap-usg-u1-007': {
    answer: 'The Supremacy Clause gives lawful federal statutes priority over state law.',
  },
  'ap-usg-u1-013': {
    answer: 'Congress lacked a dependable power to levy taxes on citizens.',
  },
  'ap-usg-u1-014': {
    answer: 'It eased fears that national power could threaten personal liberties.',
  },
  'ap-usg-u2-019': {
    answer: 'House members serve shorter terms and represent smaller districts.',
  },
  'ap-usg-u2-029': {
    answer: 'Modifying the jurisdiction of lower courts by statutory enactment',
  },
  'ap-usg-u2-048': {
    answer: 'Comment volume reflects participation, not whether input altered the rule.',
  },
  'ap-usg-u3-061': {
    answer: 'Whether race-conscious programs satisfy Equal Protection limits on state classifications',
  },
  'ap-usg-u4-065': {
    prompt: 'A teenager forms civic beliefs and partisan attitudes through family talks, school, peers, and media. What process is illustrated?',
  },
  'ap-usg-u4-071': {
    answer: 'Data showing cross-state scope, constitutional authority, and consistent policy outcomes',
  },
  'ap-usg-u4-074': {
    answer: 'A steady upward trend in support over successive weeks',
  },
  'ap-usg-u5-083': {
    answer: 'It uses state-apportioned electors to formally choose the chief executive.',
  },
  'ap-usg-u5-092': {
    answer: 'Support shifted among cohorts over time, though the chart cannot prove why.',
  },
  'ap-usg-u5-096': {
    answer: 'A winner-take-all system for state electors',
  },
  'ap-usg-u5-099': {
    answer: 'How undisclosed backers may shape the message’s perspective and credibility',
  },
  'ap-usg-u1-101': {
    prompt: 'A city charter states that public officials may exercise only powers protecting residents’ inherent liberties. Which democratic idea is expressed?',
  },
  'ap-usg-u1-114': {
    answer: 'Elected convention delegates appealed directly to voters for popular consent.',
  },
  'ap-usg-u2-119': {
    answer: 'The Great Compromise pairs state equality in one chamber with proportional seats in the other.',
  },
  'ap-usg-u2-124': {
    answer: 'The line between administrative discretion and faithfully executing laws',
  },
  'ap-usg-u2-128': {
    answer: 'At least five justices agreed on the judgment and will author the holding.',
  },
  'ap-usg-u2-129': {
    answer: 'Creating or altering lower national courts by statute',
  },
  'ap-usg-u2-131': {
    answer: 'Delegated administrative rulemaking power',
  },
  'ap-usg-u2-137': {
    answer: 'It forms foreign commitments without requiring a two-thirds Senate vote.',
  },
  'ap-usg-u2-138': {
    answer: 'A two-thirds legislative check can defeat executive opposition.',
  },
  'ap-usg-u2-145': {
    answer: 'Administrative discretion causes uneven enforcement without clear standards.',
  },
  'ap-usg-u3-160': {
    answer: 'Constitutional limits bar majorities from denying equal access to public forums.',
  },
  'ap-usg-u3-162': {
    prompt: 'A student newspaper prints a political article, and school officials remove it because they dislike its perspective even though it causes no material disruption. Which principle is most relevant?',
  },
  'ap-usg-u4-167': {
    answer: 'Defining events can reshape policy priorities and views of state action.',
  },
  'ap-usg-u4-169': {
    answer: 'Leading phrasing can nudge responses and skew survey results.',
  },
  'ap-usg-u4-171': {
    answer: 'Data showing cross-border impact and stronger coordinated federal authority',
  },
  'ap-usg-u4-172': {
    answer: 'Fiscal policy through public expenditure',
  },
  'ap-usg-u4-173': {
    answer: 'How much authority federal institutions should hold in social policy',
  },
  'ap-usg-u4-175': {
    answer: 'Correlation alone does not prove news viewing caused civic awareness.',
  },
  'ap-usg-u5-177': {
    answer: 'Less media coverage, weaker mobilization, and smaller perceived stakes reduce turnout.',
  },
  'ap-usg-u5-181': {
    answer: 'Inside lobbying by supplying expert policy information',
  },
  'ap-usg-u5-183': {
    answer: 'The leading candidate claims that state’s electoral votes under state rules.',
  },
  'ap-usg-u5-184': {
    answer: 'Decennial reapportionment and district redistricting',
  },
  'ap-usg-u5-185': {
    answer: 'Targeted electoral messaging',
  },
  'ap-usg-u5-188': {
    prompt: 'A voter backs a candidate based on shared partisan affiliation without reviewing the candidate’s current platform. Which influence is most evident?',
  },
  'ap-usg-u5-191': {
    answer: 'Party coalitions realigned over cycles without revealing the underlying cause.',
  },
  'ap-usg-u5-194': {
    answer: 'Present legal and factual arguments to inform the justices’ review.',
  },
  'ap-usg-u5-195': {
    answer: 'State-by-state electoral totals can diverge from the nationwide ballot count.',
  },
  'ap-usg-u5-196': {
    answer: 'Incumbency confers an edge, yet district competitiveness matters too.',
  },
  'ap-usg-u1-201': {
    answer: 'Popular sovereignty grounds authority in the governed.',
  },
  'ap-usg-u1-208': {
    answer: 'National institutions may exercise listed and implied powers over cross-state issues.',
  },
  'ap-usg-u2-213': {
    prompt: 'After a natural disaster, the president directs cabinet departments to coordinate relief under existing law. Which presidential role is most directly illustrated?',
  },
  'ap-usg-u2-219': {
    answer: 'Resolving the split can promote a uniform interpretation of national law.',
  },
  'ap-usg-u2-220': {
    answer: 'Elected branches shape judicial structure constitutionally without ruling on disputes.',
  },
  'ap-usg-u2-221': {
    answer: 'Delegation taps agency expertise and staffing for complex mandates.',
  },
  'ap-usg-u2-222': {
    answer: 'Notice-and-comment rulemaking lets affected groups weigh in prior to finalization.',
  },
  'ap-usg-u3-226': {
    answer: 'Official neutrality protects student expression without endorsing religion.',
  },
  'ap-usg-u3-227': {
    prompt: 'A city denies a permit for a nonviolent demonstration solely because officials dislike the group’s stance. Which constitutional concern is strongest?',
  },
  'ap-usg-u3-229': {
    answer: 'Courts weigh personal Second Amendment liberties alongside the state’s protective interest.',
  },
  'ap-usg-u3-231': {
    answer: 'Selective incorporation extends core federal liberties to state governments.',
  },
  'ap-usg-u4-246': {
    answer: 'Fiscal policy using taxation and public budgets to stabilize growth',
  },
  'ap-usg-u5-248': {
    answer: 'Prospective voting weighs rivals by anticipated governing agendas.',
  },
  'ap-usg-u5-250': {
    answer: 'Fielding nominees, blending views, turning out citizens, and organizing governance',
  },
  'ap-usg-u5-251': {
    answer: 'Parties adjust to shifting coalitions, voter incentives, and urgent issues.',
  },
  'ap-usg-u5-253': {
    answer: 'Direct lobbying by providing lawmakers with expert briefs',
  },
  'ap-usg-u5-256': {
    answer: 'The figures align with an incumbency edge in those races.',
  },
  'ap-usg-u5-257': {
    answer: 'Targeted messaging guided by data-driven campaign strategy',
  },
  'ap-usg-u5-259': {
    answer: 'Agenda setting by raising a topic’s prominence in public debate',
  },
};
