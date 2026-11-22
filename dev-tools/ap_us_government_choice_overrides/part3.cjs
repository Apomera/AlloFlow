'use strict';

// AP U.S. Government foundation pilot: choice-length parity and
// extreme-qualifier moderation overrides for Transfer Slice items (201-260).
// Note: ap-usg-u2-211's distractors are intentionally untouched to preserve
// its pinned distractor-feedback contract.

module.exports = {
  'ap-usg-u1-201': {
    answer: 'Popular sovereignty grounds authority in the people.',
  },
  'ap-usg-u1-202': {
    answer: 'Representative democracy paired with participatory tools',
  },
  'ap-usg-u1-203': {
    answer: 'Balancing personal privacy protections against swift law enforcement',
  },
  'ap-usg-u1-204': {
    answer: 'Congress relied on voluntary state funds and lacked an independent executive.',
  },
  'ap-usg-u1-205': {
    answer: 'Stronger federal capacity solves collective-action gaps while preserving limits.',
  },
  'ap-usg-u1-206': {
    answer: 'Separation of powers divides core duties across distinct branches.',
  },
  'ap-usg-u1-207': {
    answer: 'States and national authorities share administrative duties under constitutional bounds.',
  },
  'ap-usg-u1-208': {
    answer: 'National institutions may exercise enumerated and implied authority over cross-state issues.',
  },
  'ap-usg-u1-209': {
    answer: 'Multiple venues across levels of government create policy access points.',
  },
  'ap-usg-u2-210': {
    answer: 'Bicameral design assigns distinct powers and rules to each chamber.',
  },
  'ap-usg-u2-211': {
    answer: 'Committees screen, study, and revise bills prior to floor action.',
  },
  'ap-usg-u2-212': {
    answer: 'Lawmakers juggle local interests, party ties, personal goals, and chamber incentives together.',
    distractorReplacements: {
      'Representatives act only on their own personal ideology and never respond to constituents in any way at all.':
        'Representatives act strictly on their own personal ideology without responding to district voters.',
      'District concerns become entirely irrelevant once a member has joined any standing congressional committee.':
        'District concerns fade from view once a member has joined any standing congressional committee.',
    },
  },
  'ap-usg-u2-213': {
    answer: 'Chief executive directing federal law enforcement',
  },
  'ap-usg-u2-214': {
    answer: 'Appropriations and oversight constraining executive reach',
  },
  'ap-usg-u2-215': {
    answer: 'It offers executive speed, yet legal bounds and future leaders can curb or undo it.',
  },
  'ap-usg-u2-216': {
    answer: 'Public persuasion aimed at rallying support and pressuring lawmakers',
  },
  'ap-usg-u2-217': {
    answer: 'Jurisdiction assigns which court system and level may hear a case.',
  },
  'ap-usg-u2-218': {
    answer: 'Interpreting statutes and applying them to live cases',
  },
  'ap-usg-u2-220': {
    answer: 'Elected branches shape federal courts constitutionally without deciding cases.',
  },
  'ap-usg-u2-221': {
    answer: 'Delegation taps agency expertise and staffing for technical mandates.',
    distractorReplacements: {
      'Delegation makes agency decisions entirely immune from judicial and political review.':
        'Delegation shields agency decisions broadly from judicial and political review.',
      'Delegation requires agencies to exercise only those powers held by the state governments.':
        'Delegation limits agencies strictly to powers reserved for state governments.',
    },
  },
  'ap-usg-u2-222': {
    answer: 'Notice-and-comment rulemaking lets affected groups weigh in before adoption.',
  },
  'ap-usg-u2-223': {
    answer: 'Legislative oversight checks agencies through hearings, budgets, and statutory review.',
  },
  'ap-usg-u2-224': {
    answer: 'Policy outcomes emerge from ongoing interaction among branches, not one actor.',
    distractorReplacements: {
      'Only the federal judiciary can propose, implement, and fund a national policy of any kind.':
        'The federal judiciary alone can propose, implement, and fund national policy.',
      'Policy coalitions must choose one single branch and then avoid every other institution entirely.':
        'Policy coalitions must target one single branch while bypassing other institutions.',
    },
  },
  'ap-usg-u3-225': {
    answer: 'Civil liberties curbing government intrusion on personal freedoms',
  },
  'ap-usg-u3-226': {
    answer: 'Official neutrality protects student expression without endorsing worship.',
  },
  'ap-usg-u3-227': {
    answer: 'Viewpoint discrimination against peaceful expression threatens the First Amendment.',
  },
  'ap-usg-u3-228': {
    answer: 'Strong constitutional presumption against prior restraint on press publication',
    distractorReplacements: {
      'The case concerns only the Senate\'s power to confirm judges to the federal courts.':
        'The dispute centers strictly on Senate confirmation of federal judges.',
      'The case proves that all leaked information is automatically protected from publication.':
        'The dispute proves that leaked records are categorically barred from publication.',
    },
  },
  'ap-usg-u3-229': {
    answer: 'Courts weigh individual Second Amendment rights alongside the asserted public-safety goal.',
  },
  'ap-usg-u3-230': {
    answer: 'Content neutrality, safety tailoring, and adequate alternative channels',
  },
  'ap-usg-u3-231': {
    answer: 'Selective incorporation extends core Bill of Rights guarantees to states.',
  },
  'ap-usg-u3-232': {
    answer: 'Denying procedural safeguards prior to depriving someone of liberty',
  },
  'ap-usg-u3-233': {
    answer: 'Whether warrantless tracking violates Fourth Amendment privacy protections',
  },
  'ap-usg-u3-234': {
    answer: 'Movements combine legal and civic tactics to advance equal protection.',
  },
  'ap-usg-u3-235': {
    answer: 'Statutes define rights while agencies carry out day-to-day enforcement.',
    distractorReplacements: {
      'Federal legislation makes enforcement unnecessary, because discrimination ends automatically once a law passes.':
        'Federal legislation makes enforcement unnecessary, because discrimination ceases promptly once a law passes.',
      'Administrative agencies may enforce only the state constitutions and never any federal statute passed by Congress.':
        'Administrative agencies enforce state constitutions rather than federal statutes passed by Congress.',
      'Civil-rights policy is limited to judicial opinions and can never involve Congress or the federal agencies at all.':
        'Civil-rights policy rests in judicial rulings without active participation from Congress or federal agencies.',
    },
  },
  'ap-usg-u3-236': {
    answer: 'Constitutional guarantees curb majority rule to safeguard minority rights.',
  },
  'ap-usg-u3-237': {
    answer: 'How institutions promote equal opportunity within constitutional classification limits',
    distractorReplacements: {
      'Affirmative action automatically requires identical admission outcomes for every group of applicants involved.':
        'Affirmative action routinely requires identical admission outcomes for every group of applicants involved.',
      'The policy is unrelated to equal protection, because admissions decisions are never governmental in character.':
        'The policy is unrelated to equal protection, because admissions decisions fall outside public authority.',
    },
  },
  'ap-usg-u4-238': {
    answer: 'Broad principles often diverge from views on concrete programs.',
  },
  'ap-usg-u4-239': {
    answer: 'Multiple agents and experiences shape political socialization differently.',
  },
  'ap-usg-u4-240': {
    answer: 'Cohort views shifted over time, though the trend alone cannot prove why.',
  },
  'ap-usg-u4-241': {
    answer: 'Crises can shift policy views, though timing alone cannot isolate one cause.',
  },
  'ap-usg-u4-242': {
    answer: 'Probability sampling gives every listed voter a known selection chance.',
    distractorReplacements: {
      'A probability sample guarantees that every respondent answers honestly.':
        'A probability sample ensures that every respondent answers honestly.',
      'A probability sample includes only people who volunteer after seeing an advertisement.':
        'A probability sample draws strictly from people who volunteer after seeing an ad.',
    },
  },
  'ap-usg-u4-243': {
    answer: 'The figure is an estimate whose plausible range spans nearby values.',
  },
  'ap-usg-u4-244': {
    answer: 'Platforms outline contrasting ideological priorities while leaving room for internal debate.',
  },
  'ap-usg-u4-245': {
    answer: 'Ideology shapes goals while bargaining and rules shape final statutes.',
  },
  'ap-usg-u4-246': {
    answer: 'Fiscal policy using taxation and spending to steer demand',
  },
  'ap-usg-u4-247': {
    answer: 'Clarify the competing values and mechanisms before assigning labels.',
  },
  'ap-usg-u5-248': {
    answer: 'Prospective voting weighs rivals by expected future policies.',
  },
  'ap-usg-u5-249': {
    answer: 'Wider access helps without erasing gaps in motivation, info, or resources.',
  },
  'ap-usg-u5-250': {
    answer: 'Recruiting candidates, blending views, mobilizing voters, and organizing governance',
  },
  'ap-usg-u5-251': {
    answer: 'Parties adjust to shifting coalitions, voter incentives, and salient issues.',
  },
  'ap-usg-u5-252': {
    answer: 'Minor parties can shift issue focus and vote shares without winning.',
  },
  'ap-usg-u5-253': {
    answer: 'Lobbying lawmakers directly with research and draft text',
  },
  'ap-usg-u5-254': {
    answer: 'Coalitions pool resources and broaden backing around a shared goal.',
    distractorReplacements: {
      'Only political parties may legally coordinate messages about public policy.':
        'Political parties alone may legally coordinate messages about public policy.',
      'A coalition guarantees that the proposal will be enacted without opposition.':
        'A coalition ensures that the proposal will be enacted without opposition.',
    },
  },
  'ap-usg-u5-255': {
    answer: 'The Electoral College tallies state-level votes rather than one national total.',
  },
  'ap-usg-u5-256': {
    answer: 'The data align with an incumbency edge in those races.',
  },
  'ap-usg-u5-257': {
    answer: 'Targeted outreach guided by data-driven campaign strategy',
  },
  'ap-usg-u5-258': {
    answer: 'Helping voters judge which interests and funds back political speech',
  },
  'ap-usg-u5-259': {
    answer: 'Agenda setting by raising an issue’s prominence in public debate',
  },
  'ap-usg-u5-260': {
    answer: 'Fragmented feeds widen choice while reinforcing selective exposure and factual divides.',
  },
};
