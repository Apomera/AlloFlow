'use strict';

/**
 * Section-specific lesson fields for all 15 sections of
 * test_prep/ap_us_government_foundation_pilot_learning_library.json.
 *
 * Original AP U.S. Government and Politics content covering Units 1-5
 * (ap-usg-ch-01-section-01 through ap-usg-ch-05-section-03).
 */
module.exports = {
  'ap-usg-ch-01-section-01': {
    examples: [
      'State ballot initiatives and referendums illustrate participatory democracy by letting voters enact or repeal statutes directly without legislative approval.',
      'Competing labor unions, business associations, and environmental groups lobbying a House energy subcommittee reflect pluralist democracy in action.',
    ],
    commonMisconceptions: [
      'Misconception: Elite democracy means citizens cannot vote. Correction: Voters still elect officials, but institutions filter mass preferences through representatives.',
      'Misconception: Social contract theory means unlimited majority rule. Correction: Consent of the governed limits state power to protect natural rights.',
    ],
    workedDataExample: {
      headers: ['Democratic Model', 'Institutional Mechanism & Tradeoff'],
      rows: [
        [
          'Participatory',
          'Broad direct citizen engagement (town meetings, ballot initiatives); maximizes local input but can strain deliberation at national scale.',
        ],
        [
          'Pluralist',
          'Organized interest groups compete and bargain across multiple venues; broadens representation but can slow decisive policy action.',
        ],
        [
          'Elite',
          'Filtered representation through insulated institutions (Electoral College, appointed judges); prizes stability but narrows direct mass control.',
        ],
      ],
    },
    retrievalPrompts: [
      'How does the Declaration of Independence link natural rights to the legitimacy of altering or abolishing a government?',
      'Why does Federalist No. 10 favor a large pluralist republic over the small participatory republic defended in Brutus No. 1?',
      'Which features of the U.S. Constitution reflect elite democracy rather than participatory or pluralist decision-making?',
    ],
    transferMove:
      'When evaluating an unfamiliar civic reform, identify who holds decision authority and whether the design expands direct input, group bargaining, or filtered expertise.',
  },

  'ap-usg-ch-01-section-02': {
    examples: [
      'Under the Articles of Confederation, Congress could not levy taxes or regulate interstate trade, leaving the union unable to retire war debts.',
      'The Great Compromise paired population-based House representation with equal state voting in the Senate, while Article V required supermajorities to amend.',
    ],
    commonMisconceptions: [
      'Misconception: Federalist No. 10 sought to abolish factions. Correction: Madison argued liberty fosters factions, so an extended republic must control their effects.',
      'Misconception: Separation of powers keeps branches completely isolated. Correction: Federalist No. 51 blends overlapping checks so ambition counteracts ambition.',
    ],
    workedDataExample: {
      headers: ['Founding Document / Deal', 'Core Structural Argument or Resolution'],
      rows: [
        [
          'Articles of Confederation',
          'Preserved state sovereignty with a unicameral legislature, no independent executive, and unanimous consent for amendments.',
        ],
        [
          'Brutus No. 1',
          'Warned that the Supremacy and Necessary and Proper Clauses would let a distant federal government absorb state authority.',
        ],
        [
          'Federalist No. 51',
          'Defended separated powers and overlapping checks, including bicameralism and federalism, to guard against tyranny.',
        ],
      ],
    },
    retrievalPrompts: [
      "How did Shays' Rebellion expose specific structural weaknesses built into the Articles of Confederation?",
      'Why did Anti-Federalists in Brutus No. 1 view the Necessary and Proper Clause and Supremacy Clause as threats to liberty?',
      'How did the Great Compromise, Three-Fifths Compromise, and Electoral College resolve competing state interests in 1787?',
    ],
    transferMove:
      'When reading an unseen founding debate or modern institutional clash, trace whether the argument prioritizes national capacity or decentralized checks against concentrated power.',
  },

  'ap-usg-ch-01-section-03': {
    examples: [
      'In McCulloch v. Maryland, the Supreme Court used the Necessary and Proper and Supremacy Clauses to uphold a national bank and bar state taxation of it.',
      'Congress uses conditional highway grants to encourage uniform state drinking-age standards, while block grants give states wider discretion over program design.',
    ],
    commonMisconceptions: [
      'Misconception: The Tenth Amendment gives states veto power over valid federal laws. Correction: The Supremacy Clause makes constitutional federal statutes supreme.',
      'Misconception: The Commerce Clause grants Congress unlimited police power. Correction: United States v. Lopez held that local non-economic activity lies beyond it.',
    ],
    workedDataExample: {
      headers: ['Federalism Instrument', 'Effect on National vs. State Authority'],
      rows: [
        [
          'Categorical grant',
          'Funds a narrowly defined purpose with strict federal conditions, increasing national leverage over state implementation.',
        ],
        [
          'Block grant',
          'Consolidates funding for a broad policy area like community development, giving state officials greater discretion.',
        ],
        [
          'Unfunded mandate',
          'Requires states to meet federal compliance standards without full federal reimbursement, straining state budgets.',
        ],
      ],
    },
    retrievalPrompts: [
      'How do McCulloch v. Maryland and United States v. Lopez pull the balance of federal and state power in opposite directions?',
      'Why do state governors generally prefer block grants over categorical grants with cross-cutting federal conditions?',
      'How does concurrent authority let policy advocates seek action in state legislatures when federal legislation stalls?',
    ],
    transferMove:
      'In any federal-state dispute, identify the constitutional clause or fiscal tool at issue and explain whether it expands implied federal authority or preserves state discretion.',
  },

  'ap-usg-ch-02-section-01': {
    examples: [
      'The House Rules Committee sets debate time and amendment limits on a tax bill, whereas a Senate minority can use a filibuster to demand 60 votes for cloture.',
      'In Baker v. Carr and Shaw v. Reno, the Supreme Court held that malapportioned districts and predominantly racial gerrymanders raise constitutional questions.',
    ],
    commonMisconceptions: [
      'Misconception: A discharge petition is a Senate tool to end a filibuster. Correction: Discharge petitions pry bills from House committees; cloture ends Senate debate.',
      'Misconception: Lawmakers stick to one rigid representation model. Correction: Most act as politicos, balancing delegate, trustee, and partisan pressures.',
    ],
    workedDataExample: {
      headers: ['Chamber Feature', 'House of Representatives vs. Senate'],
      rows: [
        [
          'Debate & floor control',
          'House uses the Rules Committee and strict time limits; Senate allows unlimited debate, holds, and unanimous consent agreements.',
        ],
        [
          'Constitutional powers',
          'House initiates revenue bills and brings impeachment articles; Senate confirms appointments, ratifies treaties, and tries impeachments.',
        ],
        [
          'Term & constituency',
          'House members serve two-year district terms tuned to local voters; Senators serve staggered six-year statewide terms.',
        ],
      ],
    },
    retrievalPrompts: [
      'How do standing committees, conference committees, and party leadership act as gatekeepers in the legislative process?',
      'Why does mandatory spending on entitlements limit how much Congress can cut through annual discretionary appropriations?',
      'How does divided government increase gridlock and encourage logrolling or omnibus bills to pass legislation?',
    ],
    transferMove:
      'When predicting whether a proposed bill will advance, examine chamber rules, committee gatekeeping, party control, and constituency incentives before citing individual ideology.',
  },

  'ap-usg-ch-02-section-02': {
    examples: [
      'A president can issue an executive order directing federal agency procurement rules, yet Congress can override its effect by statute or funding limits.',
      'In Marbury v. Madison, the Supreme Court established judicial review, while Federalist No. 78 argued life tenure insulates judges from political pressure.',
    ],
    commonMisconceptions: [
      'Misconception: Executive agreements need two-thirds Senate approval. Correction: Only formal treaties require Senate votes, and later presidents can revoke agreements.',
      'Misconception: Stare decisis bars the Supreme Court from overruling precedent. Correction: Precedent promotes stability, but the Court can overturn prior rulings.',
    ],
    workedDataExample: {
      headers: ['Branch Power', 'Primary Constitutional or Institutional Check'],
      rows: [
        [
          'Presidential veto & signing',
          'Congress can override a regular veto with a two-thirds vote in both chambers, though pocket vetoes cannot be overridden.',
        ],
        [
          'Executive orders & bully pulpit',
          'Federal courts can strike down ultra vires orders, and Congress can defund or pass legislation reversing agency directives.',
        ],
        [
          'Supreme Court judicial review',
          'Congress can alter appellate jurisdiction, pass constitutional amendments, or reshape courts via Senate confirmation of nominees.',
        ],
      ],
    },
    retrievalPrompts: [
      'Why did Hamilton argue in Federalist No. 70 that a single energetic executive provides greater accountability than a council?',
      'How do the bully pulpit and modern communication channels help presidents persuade Congress without formal constitutional power?',
      'How do judicial restraint and judicial activism differ in their approach to precedent and invalidating elected-branch laws?',
    ],
    transferMove:
      'In an interbranch dispute over an executive action or court ruling, name the formal or informal power invoked and specify which legal or political check constrains it.',
  },

  'ap-usg-ch-02-section-03': {
    examples: [
      'After Congress passes clean-air legislation, the EPA uses discretionary authority and notice-and-comment rulemaking to set enforceable emissions thresholds.',
      'A House oversight committee subpoenas agency officials and cuts discretionary funding when an independent regulatory commission misses statutory deadlines.',
    ],
    commonMisconceptions: [
      'Misconception: Federal agencies invent policy goals without legal authority. Correction: Bureaucratic rulemaking rests on statutory delegation from Congress.',
      'Misconception: Iron triangles and issue networks are identical. Correction: Iron triangles are tight three-way alliances, while issue networks are fluid coalitions.',
    ],
    workedDataExample: {
      headers: ['Oversight Actor', 'Lever Over Bureaucratic Implementation'],
      rows: [
        [
          'Congress',
          'Uses committee hearings, power of the purse, statutory rewrites, and GAO audits to curb or redirect agency discretion.',
        ],
        [
          'President',
          'Appoints cabinet secretaries and agency heads, issues executive orders, and reviews draft rules through OMB.',
        ],
        [
          'Federal Courts',
          'Reviews agency regulations and adjudications to ensure compliance with authorizing statutes and constitutional limits.',
        ],
      ],
    },
    retrievalPrompts: [
      'Why does Congress delegate broad rulemaking discretion to executive agencies rather than writing every technical standard?',
      'How did the Pendleton Civil Service Act shift federal staffing from political patronage to merit-based administration?',
      'How do interest groups, congressional committees, and agencies interact differently in an iron triangle versus an issue network?',
    ],
    transferMove:
      'When evaluating an agency rule or enforcement clash, trace its statutory mandate, notice-and-comment record, and which legislative, executive, or judicial check applies.',
  },

  'ap-usg-ch-03-section-01': {
    examples: [
      'In Engel v. Vitale, state-authored school prayer violated the Establishment Clause, whereas Wisconsin v. Yoder upheld Amish free-exercise rights.',
      'Tinker v. Des Moines protected peaceful student armbands as symbolic speech, while New York Times Co. v. United States set a heavy bar against prior restraint.',
    ],
    commonMisconceptions: [
      'Misconception: The First Amendment stops private employers from limiting speech. Correction: Civil liberties restrain government actors, not private organizations.',
      'Misconception: Free speech protects every statement in all settings. Correction: Courts permit neutral time-place-manner rules and unprotected incitement bans.',
    ],
    workedDataExample: {
      headers: ['First Amendment Clause', 'Landmark Boundary Test or Principle'],
      rows: [
        [
          'Establishment Clause',
          'Bars government sponsorship or coercion of religion, such as state-composed public school prayer (Engel v. Vitale).',
        ],
        [
          'Free Exercise Clause',
          'Protects sincere religious practice unless a neutral, compelling state interest justifies a narrow burden (Wisconsin v. Yoder).',
        ],
        [
          'Speech & Press Clauses',
          'Shields symbolic expression unless substantially disruptive (Tinker) and presumes prior restraint unconstitutional (NYT v. US).',
        ],
      ],
    },
    retrievalPrompts: [
      'How do the Establishment Clause and Free Exercise Clause sometimes pull in opposite directions in public-school disputes?',
      'How did the Supreme Court distinguish protected political speech from punishable wartime speech in Schenck v. United States?',
      'Why does the Supreme Court scrutinize content-based speech restrictions more strictly than time, place, and manner rules?',
    ],
    transferMove:
      'In an unseen First Amendment scenario, confirm state action first, name the specific clause, and weigh expressive or religious liberty against the claimed public interest.',
  },

  'ap-usg-ch-03-section-02': {
    examples: [
      'Through selective incorporation under the Fourteenth Amendment, McDonald v. Chicago applied the Second Amendment right to keep and bear arms to state laws.',
      'Gideon v. Wainwright guaranteed court-appointed counsel for indigent felony defendants, while the Miranda rule requires warnings before custodial interrogation.',
    ],
    commonMisconceptions: [
      'Misconception: The Bill of Rights bound states from 1791. Correction: Selective incorporation applied most guarantees to states case by case via the 14th Amendment.',
      'Misconception: Procedural due process guarantees an acquittal. Correction: It mandates fair legal procedures like warrants and counsel, not a particular outcome.',
    ],
    workedDataExample: {
      headers: ['Due Process Protection', 'Constitutional Mechanism & Liberty-Order Balance'],
      rows: [
        [
          'Selective incorporation',
          'Uses the Fourteenth Amendment Due Process Clause to apply fundamental Bill of Rights guarantees to state and local laws (McDonald).',
        ],
        [
          'Procedural due process',
          'Enforces fair criminal procedures via Fourth Amendment search limits, the exclusionary rule, Miranda warnings, and Sixth Amendment counsel (Gideon).',
        ],
        [
          'Substantive due process',
          'Evaluates whether unenumerated liberty or privacy interests restrict state laws beyond the procedures used to enact them.',
        ],
      ],
    },
    retrievalPrompts: [
      'How did the Fourteenth Amendment Due Process Clause enable selective incorporation of Bill of Rights guarantees against states?',
      'How do the exclusionary rule and Miranda warnings balance individual Fourth and Fifth Amendment rights against public safety?',
      'What distinguishes a procedural due process challenge to police conduct from a substantive due process challenge to a statute?',
    ],
    transferMove:
      'When evaluating a state law or search in a new case, check whether selective incorporation applies and whether the claim targets unfair procedure or substantive liberty.',
  },

  'ap-usg-ch-03-section-03': {
    examples: [
      'In Brown v. Board of Education, the Supreme Court held that de jure school segregation violated the Fourteenth Amendment Equal Protection Clause.',
      "Grassroots boycotts and King's Letter from a Birmingham Jail built pressure for Congress to pass the Civil Rights Act of 1964 and Voting Rights Act of 1965.",
    ],
    commonMisconceptions: [
      'Misconception: Civil rights and civil liberties are identical. Correction: Civil liberties restrict state intrusion; civil rights bar unequal group treatment.',
      'Misconception: Equal protection bans every legal classification. Correction: Courts use rational basis, intermediate, or strict scrutiny depending on the class.',
    ],
    workedDataExample: {
      headers: ['Equality Strategy', 'How It Advances Civil Rights & Key Limits'],
      rows: [
        [
          'Social movement pressure',
          'Protests, boycotts, and moral appeals like Letter from a Birmingham Jail shift public opinion and force legislative agendas.',
        ],
        [
          'Constitutional litigation',
          'Suits under the Equal Protection Clause strike down de jure discrimination (Brown v. Board), though enforcement needs elected branches.',
        ],
        [
          'Federal statutes & Title IX',
          'Laws like the Civil Rights Act of 1964 and Title IX ban discrimination in public spaces and education using commerce and spending powers.',
        ],
      ],
    },
    retrievalPrompts: [
      'How did Letter from a Birmingham Jail justify nonviolent direct action when majorities resisted desegregation?',
      'Why did the Civil Rights Act of 1964 and Voting Rights Act of 1965 prove necessary even after Brown v. Board of Education?',
      'How do debates over race-conscious admissions and affirmative action reflect competing interpretations of the Equal Protection Clause?',
    ],
    transferMove:
      'When analyzing a modern civil-rights dispute, distinguish constitutional equal-protection claims from statutory remedies and trace how movements, courts, and Congress interact.',
  },

  'ap-usg-ch-04-section-01': {
    examples: [
      'Americans widely endorse individualism, free enterprise, and rule of law yet disagree sharply over how far regulation should promote equality of opportunity.',
      "Family political discussions, civics courses, peer networks, and major generational events like recessions or wars reshape voters' partisan attitudes over time.",
    ],
    commonMisconceptions: [
      'Misconception: Shared American political culture means voters agree on specific policies. Correction: Groups invoke the same core values to defend opposing policies.',
      'Misconception: Generational and lifecycle effects are identical. Correction: Cohort events drive generational shifts, whereas aging drives lifecycle changes.',
    ],
    workedDataExample: {
      headers: ['Socialization Driver', 'How It Shapes Political Attitudes'],
      rows: [
        [
          'Family & schools',
          'Establish early party leanings, civic norms, and baseline trust in institutions during childhood and adolescence.',
        ],
        [
          'Generational & lifecycle shifts',
          'Major formative events mark a cohort for decades, while changing economic or family roles alter policy priorities with age.',
        ],
        [
          'Globalization & media',
          'Cross-border trade, migration, and partisan media ecosystems reshape views on economic security, identity, and national role.',
        ],
      ],
    },
    retrievalPrompts: [
      'Why can liberals and conservatives both cite equality of opportunity and limited government while proposing opposite laws?',
      'How do generational effects from a major national crisis differ from lifecycle effects as voters enter new life stages?',
      'Why is the family typically the strongest initial agent of political socialization before peers and media gain influence?',
    ],
    transferMove:
      'When explaining opinion gaps across groups in a survey, distinguish shared cultural values from specific socialization agents, cohort events, or lifecycle shifts.',
  },

  'ap-usg-ch-04-section-02': {
    examples: [
      'A national poll of 1,000 randomly sampled likely voters showing 51% to 48% with a +/-3.5% margin of error represents a statistical tie, not a clear lead.',
      'Replacing neutral phrasing with loaded language about a tax proposal introduces question-wording bias that inflates opposition even with random sampling.',
    ],
    commonMisconceptions: [
      'Misconception: A massive online volunteer poll beats a smaller random sample. Correction: Without random probability sampling, larger size magnifies selection bias.',
      'Misconception: Margin of error measures every polling flaw. Correction: It captures random sampling variance only, not loaded wording or nonresponse bias.',
    ],
    workedDataExample: {
      headers: ['Poll Design Element', 'Validity Check Before Drawing a Conclusion'],
      rows: [
        [
          'Sampling method',
          'Verify random probability sampling of the target population (adults vs. likely voters) and weighting for nonresponse.',
        ],
        [
          'Margin of error',
          'Confirm whether a gap between two options exceeds twice the margin of error before calling one position ahead.',
        ],
        [
          'Question wording & timing',
          'Inspect for leading terms, social desirability pressure, and whether the poll is a one-time snapshot or a tracking trend.',
        ],
      ],
    },
    retrievalPrompts: [
      'Why does a two-point lead inside a +/-4% margin of error fail to prove that one candidate leads in the electorate?',
      'How do benchmark polls, tracking polls, and exit polls serve different purposes during a political campaign?',
      'Why can nonresponse bias and social desirability bias distort results even when a pollster uses random digit dialing?',
    ],
    transferMove:
      'Before citing any public-opinion chart or survey headline, audit its sampling frame, sample size, margin of error, and question neutrality to bound what the data actually support.',
  },

  'ap-usg-ch-04-section-03': {
    examples: [
      'During a recession, Congress and the president debate Keynesian fiscal stimulus versus supply-side tax cuts, while the Federal Reserve adjusts interest rates.',
      'Liberals generally favor federal regulation to expand healthcare access and social safety nets, while conservatives favor deregulation and market competition.',
    ],
    commonMisconceptions: [
      'Misconception: The Federal Reserve controls federal taxes and spending. Correction: Elected branches set fiscal policy, while the Fed manages monetary policy.',
      'Misconception: Libertarians and conservatives match on all issues. Correction: Both favor free markets, yet libertarians generally oppose state social regulation too.',
    ],
    workedDataExample: {
      headers: ['Economic / Policy Approach', 'Preferred Mechanism & Role of Government'],
      rows: [
        [
          'Keynesian fiscal policy',
          'Uses federal spending increases or targeted tax cuts to boost aggregate demand during economic downturns.',
        ],
        [
          'Supply-side fiscal policy',
          'Uses broad tax reductions and deregulation, echoing Adam Smith free-enterprise logic, to spur investment and production.',
        ],
        [
          'Monetary policy (Fed)',
          'Adjusts interest rates, reserve requirements, and open-market operations independently to curb inflation or support employment.',
        ],
      ],
    },
    retrievalPrompts: [
      'How do Keynesian and supply-side economists disagree on using federal taxation and spending to stabilize an economy?',
      'Why does the Federal Reserve operate with structural independence from Congress and the president when setting interest rates?',
      'Where do liberal, conservative, and libertarian ideologies converge and diverge across economic versus social policy debates?',
    ],
    transferMove:
      'When evaluating a new policy proposal, separate economic from social intervention and identify whether it relies on elected-branch fiscal tools or Fed monetary policy.',
  },

  'ap-usg-ch-05-section-01': {
    examples: [
      'The Fifteenth, Nineteenth, Twenty-Fourth, and Twenty-Sixth Amendments expanded the constitutional franchise across race, sex, poll-tax barriers, and age.',
      'States that adopt automatic voter registration and extended mail voting reduce administrative friction, though turnout still lags in midterm elections.',
    ],
    commonMisconceptions: [
      'Misconception: Voting amendments ended all state barriers immediately. Correction: Restrictions like literacy tests persisted until the Voting Rights Act of 1965.',
      'Misconception: Party-line voting is purely blind habit. Correction: Partisan cues often interact with retrospective judgments and rational-choice policy calculations.',
    ],
    workedDataExample: {
      headers: ['Voting Behavior Model', 'Decision Rule Used by the Voter'],
      rows: [
        [
          'Rational-choice voting',
          "Selects the candidate whose stated policy platform best advances the voter's personal or economic interests.",
        ],
        [
          'Retrospective vs. prospective',
          'Rewards or punishes incumbents for past performance (retrospective) or weighs promises about future outcomes (prospective).',
        ],
        [
          'Party-line voting',
          'Uses party identification as an informational shortcut to vote consistently across federal, state, and local offices.',
        ],
      ],
    },
    retrievalPrompts: [
      'How did the 15th, 19th, 24th, and 26th Amendments each expand constitutional protection of the right to vote?',
      'Why is voter turnout consistently higher in presidential elections than in congressional midterm or local elections?',
      'How do political efficacy, demographic factors, and state registration laws combine to shape turnout disparities?',
    ],
    transferMove:
      "When interpreting turnout data or a state election law change, connect the institutional rule to voting costs and identify which voting model best fits the electorate's decision.",
  },

  'ap-usg-ch-05-section-02': {
    examples: [
      'Political parties recruit candidates and draft broad platforms to win elections, while an interest group files an amicus curiae brief to influence a ruling.',
      'Under winner-take-all plurality rules, major parties often absorb popular third-party ideas into their platforms rather than ceding seats to minor parties.',
    ],
    commonMisconceptions: [
      'Misconception: Interest groups nominate ballot candidates like parties. Correction: Parties run candidates to govern; interest groups pressure officials on narrow goals.',
      'Misconception: Beneficiaries automatically join public interest groups. Correction: The free-rider problem lets people enjoy collective goods without paying dues.',
    ],
    workedDataExample: {
      headers: ['Linkage Institution', 'Primary Goal, Strategy & Structural Limit'],
      rows: [
        [
          'Major political parties',
          'Build broad voter coalitions to win office via nominations and platforms; weakened by candidate-centered campaigns and primary elections.',
        ],
        [
          'Minor / third parties',
          'Highlight neglected issues or protest coalitions; constrained by winner-take-all districts, ballot-access rules, and platform absorption.',
        ],
        [
          'Interest groups',
          'Shape specific policies through lobbying, amicus briefs, grassroots mobilization, and PACs; constrained by free riders and unequal resources.',
        ],
      ],
    },
    retrievalPrompts: [
      'How do candidate-centered primaries and campaign finance changes weaken formal political party organizations?',
      'Why do winner-take-all single-member districts make it structurally difficult for third parties to win legislative seats?',
      'How do interest groups use selective incentives to overcome the free-rider problem when recruiting dues-paying members?',
    ],
    transferMove:
      'When evaluating a linkage-institution strategy, distinguish party coalition-building from targeted group lobbying or litigation and weigh structural rules and resource gaps.',
  },

  'ap-usg-ch-05-section-03': {
    examples: [
      'Because most states award Electoral College votes winner-take-all, presidential campaigns concentrate ads and travel in a handful of competitive swing states.',
      'Following Citizens United v. FEC, Super PACs can spend unlimited independent funds on campaign ads so long as they do not coordinate directly with candidates.',
    ],
    commonMisconceptions: [
      'Misconception: Citizens United eliminated limits on direct candidate donations. Correction: It lifted independent-spending bans while keeping direct contribution caps.',
      'Misconception: Horse-race journalism focuses heavily on policy details. Correction: Horse-race coverage emphasizes poll standings and tactics over substantive proposals.',
    ],
    workedDataExample: {
      headers: ['Campaign / Media Factor', 'Strategic Effect on Voters and Elections'],
      rows: [
        [
          'Electoral College rules',
          'Winner-take-all state allocation lets a candidate win 270 electoral votes without a national popular plurality and focuses spending on swing states.',
        ],
        [
          'Incumbency advantage',
          'Name recognition, constituent casework, franking privileges, and fundraising networks give sitting House members high reelection rates.',
        ],
        [
          'Media agenda setting',
          'Gatekeeping, horse-race polling coverage, and partisan streaming outlets shape which issues seem urgent and reinforce selective exposure.',
        ],
      ],
    },
    retrievalPrompts: [
      'How do open primaries, closed primaries, and caucuses create different incentives for candidates seeking a party nomination?',
      'Why does Citizens United v. FEC distinguish protected independent expenditures from regulated direct campaign contributions?',
      'How do media consolidation, horse-race coverage, and ideologically fragmented outlets affect voter information and trust?',
    ],
    transferMove:
      'When analyzing an election result or coverage trend, link institutional rules such as primaries, finance law, and media incentives to strategic candidate behavior.',
  },
};
