'use strict';

// Section-specific retrieval checks for the 15 AP U.S. Government learning
// library sections (3 per unit across Units 1-5). Replaces the former generic
// repeated study-move check with varied answer indices and balanced lengths.

module.exports = {
  'ap-usg-ch-01-section-01': {
    prompt: 'A town holds open assemblies where residents debate and vote on local ordinances directly, while state laws are enacted by elected legislators. Which distinction does this illustrate?',
    choices: [
      'Direct participatory mechanisms operating alongside representative democracy',
      'Elite governance replacing local civic input through appointed commissions across counties',
      'Judicial supremacy overturning local budgets whenever turnout falls below fifty percent',
      'Confederate sovereignty allowing towns to nullify federal treaties passed by the Senate',
    ],
    answerIndex: 0,
    rationale: 'Open resident assemblies illustrate participatory democracy, while elected state legislators reflect representative institutions functioning within the same constitutional system.',
  },
  'ap-usg-ch-01-section-02': {
    prompt: 'During ratification debates, why did Anti-Federalists such as the author of Brutus No. 1 worry about the Necessary and Proper Clause and the Supremacy Clause?',
    choices: [
      'They feared those clauses would prevent Congress from raising revenue to repay wartime debts.',
      'They argued broad national powers could gradually absorb state authority and threaten liberty.',
      'They believed those clauses required every federal bill to be approved directly by state governors.',
      'They worried the clauses eliminated lifetime judicial tenure and weakened federal appellate review.',
    ],
    answerIndex: 1,
    rationale: 'Brutus No. 1 warned that combining implied powers with federal supremacy in a large republic could erode state sovereignty and distance rulers from citizens.',
  },
  'ap-usg-ch-01-section-03': {
    prompt: 'How do categorical grants with strict compliance conditions typically differ from block grants in American federalism?',
    choices: [
      'Block grants transfer all local tax authority directly to federal agencies for national management.',
      'Categorical grants can be spent on any state priority without federal reporting or oversight.',
      'Categorical grants fund narrow purposes with stricter rules, while block grants give wider scope.',
      'Block grants require a constitutional amendment before states may apply funds to regional needs.',
    ],
    answerIndex: 2,
    rationale: 'Categorical grants fund defined purposes with stricter federal conditions, while block grants combine funds into wider functional areas giving states greater administrative flexibility.',
  },
  'ap-usg-ch-02-section-01': {
    prompt: 'Why does the House Rules Committee wield procedural gatekeeping power that has no exact counterpart in the Senate?',
    choices: [
      'The Senate prohibits standing committees from amending bills before they reach floor consideration.',
      'House members serve six-year terms that shield leadership from local district accountability.',
      'The Constitution assigns treaty ratification and judicial confirmation exclusively to House committees.',
      'The House’s larger size requires structured debate rules, while the Senate relies on unanimous consent.',
    ],
    answerIndex: 3,
    rationale: 'Because the House has 435 members, the Rules Committee sets debate limits and amendment terms, whereas the smaller Senate generally schedules debate through unanimous consent agreements.',
  },
  'ap-usg-ch-02-section-02': {
    prompt: 'When a president faces a divided Congress, why is going public an uncertain substitute for formal legislative powers?',
    choices: [
      'Public appeals can raise issue salience, yet lawmakers still weigh district and party incentives.',
      'Constitutional rules bar presidents from addressing citizens directly while appropriations bills are pending.',
      'Televised speeches legally obligate congressional committees to schedule floor votes within thirty days.',
      'Supreme Court precedent invalidates statutes passed after a president campaigns in competitive districts.',
    ],
    answerIndex: 0,
    rationale: 'The bully pulpit can focus public attention on presidential priorities, but members of Congress remain accountable to distinct constituencies and party coalitions.',
  },
  'ap-usg-ch-02-section-03': {
    prompt: 'How does congressional oversight balance agency expertise with democratic accountability in bureaucratic policymaking?',
    choices: [
      'It replaces career civil servants with elected lawmakers who draft every technical safety standard directly.',
      'It uses hearings, reporting, and appropriations to check compliance without running daily operations.',
      'It shields independent regulatory commissions from judicial review whenever Congress approves their budgets.',
      'It transfers notice-and-comment rulemaking authority from federal departments to state governors.',
    ],
    answerIndex: 1,
    rationale: 'Oversight lets Congress monitor whether agencies honor statutory mandates through hearings, audits, and funding controls while preserving specialized administrative capacity.',
  },
  'ap-usg-ch-03-section-01': {
    prompt: 'In First Amendment doctrine, how does the Free Exercise Clause interact with the Establishment Clause in public schools?',
    choices: [
      'Schools must ban all private student prayer to avoid violating federal funding rules for public education.',
      'Schools may sponsor official daily worship provided families can request written exemptions each semester.',
      'Schools stay neutral on worship while allowing voluntary student expression on equal terms.',
      'Schools delegate all religious-liberty disputes to local referendums rather than constitutional standards.',
    ],
    answerIndex: 2,
    rationale: 'Neutrality respects both clauses: public schools cannot endorse or compel religious observance under the Establishment Clause, yet students retain protected private expression.',
  },
  'ap-usg-ch-03-section-02': {
    prompt: 'What constitutional mechanism allowed the Supreme Court to apply most Bill of Rights criminal-procedure protections to state trials?',
    choices: [
      'The Full Faith and Credit Clause requiring states to adopt federal criminal sentencing statutes',
      'The Commerce Clause authorizing Congress to merge state trial courts into the federal judiciary',
      'The Tenth Amendment transferring appellate authority over local policing to executive agencies',
      'Selective incorporation via the Fourteenth Amendment Due Process Clause case by case',
    ],
    answerIndex: 3,
    rationale: 'Through selective incorporation under the Fourteenth Amendment, the Supreme Court gradually bound states to fundamental Bill of Rights guarantees including counsel and search limits.',
  },
  'ap-usg-ch-03-section-03': {
    prompt: 'Why did civil-rights movements combine constitutional litigation with grassroots protest and federal lobbying?',
    choices: [
      'Court rulings, public pressure, and statutes reinforced each other to turn rights into practice.',
      'Federal courts lacked jurisdiction over equal-protection claims until Congress repealed state constitutions.',
      'Grassroots demonstrations legally overruled state laws without requiring congressional enforcement statutes.',
      'Interest groups were barred from filing amicus briefs in federal appeals before the late twentieth century.',
    ],
    answerIndex: 0,
    rationale: 'Litigation established constitutional principles, mobilization shifted public urgency, and statutes such as the Civil Rights Act supplied enforcement tools.',
  },
  'ap-usg-ch-04-section-01': {
    prompt: 'Why do political scientists treat family, peer networks, schools, and major historical events as interacting agents of political socialization?',
    choices: [
      'Early civic instruction fixes a person’s partisan identity permanently before adulthood begins.',
      'Multiple influences reinforce or reshape political beliefs across different stages of life.',
      'Major national crises erase demographic and regional differences across every age cohort uniformly.',
      'Media exposure replaces family and community influences once citizens register to vote for the first time.',
    ],
    answerIndex: 1,
    rationale: 'Political socialization unfolds over a lifetime as early family cues interact with education, peers, media environments, and salient public events.',
  },
  'ap-usg-ch-04-section-02': {
    prompt: 'A national poll of 1,000 randomly sampled adults shows Candidate A at 49% and Candidate B at 47%, with a margin of error of ±3 points. What is the soundest inference?',
    choices: [
      'Candidate A holds a decisive two-point majority across the entire voting-age population.',
      'The small gap proves the survey used leading wording that invalidated the sampling frame.',
      'The race is statistically close because plausible support ranges for both candidates overlap.',
      'Increasing sample size eliminates nonresponse bias and wording effects from the estimate.',
    ],
    answerIndex: 2,
    rationale: 'When the difference between candidates lies well inside the ±3-point margin of error, sampling uncertainty prevents concluding that either candidate clearly leads.',
  },
  'ap-usg-ch-04-section-03': {
    prompt: 'How do fiscal policy and monetary policy differ in who directs them and which tools they rely on?',
    choices: [
      'Federal courts set monetary interest rates while state governors approve national fiscal tax brackets.',
      'Monetary policy relies on federal income-tax bills while fiscal policy uses Federal Reserve bond trades.',
      'Both policies are directed solely by the president through executive orders without statutory limits.',
      'Elected branches set taxes and spending in fiscal policy; the Federal Reserve guides monetary tools.',
    ],
    answerIndex: 3,
    rationale: 'Congress and the president enact fiscal policy through taxation and federal spending, whereas the independent Federal Reserve manages monetary policy via interest rates and money supply.',
  },
  'ap-usg-ch-05-section-01': {
    prompt: 'How does retrospective voting differ from prospective voting when a citizen evaluates an incumbent officeholder?',
    choices: [
      'Retrospective voting weighs past performance, while prospective voting weighs expected future plans.',
      'Retrospective voting relies on party-line ballots, while prospective voting forbids choosing incumbents.',
      'Prospective voting applies only in local referendums, whereas retrospective voting governs federal primaries.',
      'Retrospective voting measures registration rules, while prospective voting counts demographic turnout rates.',
    ],
    answerIndex: 0,
    rationale: 'Retrospective voters reward or penalize incumbents based on recent results, whereas prospective voters compare candidates’ promises and anticipated policy direction.',
  },
  'ap-usg-ch-05-section-02': {
    prompt: 'Why do broad public-interest groups often struggle with the free-rider problem more acutely than narrow trade associations?',
    choices: [
      'Public-interest groups are legally prohibited from hiring lobbyists or submitting agency comments.',
      'Collective policy wins benefit nonmembers too, reducing incentives for individuals to join or pay.',
      'Trade associations receive automatic federal funding whenever membership falls below national thresholds.',
      'Narrow economic groups cannot form coalitions with allied organizations during legislative committee hearings.',
    ],
    answerIndex: 1,
    rationale: 'Because collective goods such as cleaner air cannot easily exclude noncontributors, rational individuals may enjoy the benefit without paying dues unless selective incentives exist.',
  },
  'ap-usg-ch-05-section-03': {
    prompt: 'Why do presidential campaigns concentrate visits and advertising heavily in a small set of battleground states?',
    choices: [
      'Federal campaign-finance statutes bar candidates from purchasing television airtime in safe states.',
      'The Constitution awards bonus Senate seats to states that record the highest presidential turnout.',
      'Most states use winner-take-all electoral allocation, making narrow margins pivotal in swing states.',
      'National media networks refuse to cover policy speeches delivered outside early-primary states.',
    ],
    answerIndex: 2,
    rationale: 'Because forty-eight states and D.C. award all their electoral votes to the statewide plurality winner, flipping a closely contested state yields a decisive block of electoral votes.',
  },
};
