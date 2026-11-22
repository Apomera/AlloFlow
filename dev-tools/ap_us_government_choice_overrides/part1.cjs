'use strict';

// AP U.S. Government foundation pilot: choice-length parity, prompt-length,
// and extreme-qualifier moderation overrides for Foundation Slice items (001-100).
// Every override preserves the exact constitutional principle tested while
// keeping keyed choices concise relative to distractors and removing
// asymmetric extreme qualifiers from distractors.

module.exports = {
  'ap-usg-u1-004': {
    answer: 'It exposed national weakness in responding to internal unrest.',
  },
  'ap-usg-u1-005': {
    answer: 'It paired population-based House seats with equal state representation in the Senate.',
  },
  'ap-usg-u1-007': {
    answer: 'The Supremacy Clause gives valid federal statutes priority over conflicting state law.',
    distractorReplacements: {
      'The Tenth Amendment automatically invalidates every federal law affecting a state.':
        'The Tenth Amendment routinely invalidates any federal statute affecting a state.',
      'State law always prevails because states existed before the federal government.':
        'State law generally prevails because states predated the federal government.',
    },
  },
  'ap-usg-u1-008': {
    answer: 'Congress holds implied powers under the Necessary and Proper Clause, and states cannot block federal actions.',
    distractorReplacements: {
      'Congress may exercise only the powers listed word-for-word in Article I, so implied powers are never valid.':
        'Congress is limited to powers listed word-for-word in Article I, leaving implied powers outside its scope.',
      'The Supreme Court may review only state cases involving criminal law, leaving federal questions to Congress.':
        'The Supreme Court reviews state criminal disputes while leaving federal constitutional questions to Congress.',
    },
  },
  'ap-usg-u1-009': {
    answer: 'Advocates can pursue policy change through both national institutions and state governments.',
  },
  'ap-usg-u1-010': {
    answer: 'It roots legitimate authority in the consent and rights of the people.',
  },
  'ap-usg-u1-012': {
    answer: 'A distant national government could threaten individual liberty and state authority.',
  },
  'ap-usg-u1-014': {
    answer: 'It addressed fears that national power could threaten individual rights.',
  },
  'ap-usg-u1-015': {
    answer: 'The Constitution assigns lawmaking, executive, and judicial roles separately.',
  },
  'ap-usg-u1-016': {
    answer: 'Administering local elections and public schools within constitutional limits',
  },
  'ap-usg-u2-019': {
    answer: 'Representatives serve shorter terms and narrower constituencies.',
  },
  'ap-usg-u2-023': {
    answer: 'Overriding a veto with the required supermajority in both chambers',
  },
  'ap-usg-u2-024': {
    answer: 'They direct agency implementation without awaiting a new statute, subject to legal limits.',
  },
  'ap-usg-u2-026': {
    answer: 'Life tenure during good behavior and protected pay',
  },
  'ap-usg-u2-027': {
    answer: 'Courts may strike down unconstitutional government actions.',
  },
  'ap-usg-u2-028': {
    answer: 'Four justices agree a lower ruling raises an important legal question.',
  },
  'ap-usg-u2-029': {
    answer: 'Altering lower federal court jurisdiction within constitutional limits',
  },
  'ap-usg-u2-030': {
    answer: 'Executing statutes and administering federal programs',
  },
  'ap-usg-u2-033': {
    answer: 'Different branch powers affect how policy is written, carried out, and reviewed.',
  },
  'ap-usg-u2-035': {
    answer: 'They divide work, build expertise, hold hearings, and revise bills.',
  },
  'ap-usg-u2-036': {
    answer: 'Constituency service and concentrated-interest rewards',
  },
  'ap-usg-u2-037': {
    answer: 'Directing federal agencies to carry out statutes under White House priorities',
  },
  'ap-usg-u2-038': {
    answer: 'Nominating a federal judge for confirmation',
  },
  'ap-usg-u2-039': {
    answer: 'Congress can curb funding or pass contrary laws, and courts can review executive authority.',
    distractorReplacements: {
      'The president can never direct executive agencies to act without first obtaining a new constitutional amendment.':
        'The president cannot direct executive agencies to act without first obtaining a new constitutional amendment.',
      'Unilateral actions become automatically permanent once they are published in the Federal Register for public notice.':
        'Unilateral actions become permanently binding once they are published in the Federal Register for public notice.',
      'Only state courts, and never Congress or a federal judge, have any authority to review an executive action.':
        'State courts, rather than Congress or federal judges, hold exclusive authority to review an executive action.',
    },
  },
  'ap-usg-u2-040': {
    answer: 'The values, audience, evidence, and frame linking policy to public concerns',
  },
  'ap-usg-u2-041': {
    answer: 'Presidential nomination followed by Senate confirmation',
  },
  'ap-usg-u2-043': {
    answer: 'Compare privacy expectations and official search justifications across both rulings.',
  },
  'ap-usg-u2-044': {
    answer: 'Congress may revise statutes or adjust funding to shape implementation.',
  },
  'ap-usg-u2-045': {
    answer: 'Clarify what each measure tracks before evaluating enforcement.',
  },
  'ap-usg-u2-046': {
    answer: 'Notice-and-comment procedures let affected groups shape final rules.',
  },
  'ap-usg-u2-047': {
    answer: 'Oversight catches implementation flaws while preserving specialized agency execution.',
  },
  'ap-usg-u2-048': {
    answer: 'Comment volume shows participation, not whether feedback altered the rule.',
  },
  'ap-usg-u3-049': {
    answer: 'To safeguard individual liberties against government overreach',
  },
  'ap-usg-u3-053': {
    answer: 'The Second Amendment protects an individual right to keep a firearm for lawful home self-defense.',
    distractorReplacements: {
      'The Second Amendment applies only to organized state militias and protects no individual right at all.':
        'The Second Amendment governs organized state militias without recognizing a personal firearm right.',
      'The Second Amendment applies only to voting rights in federal elections and not to any other activity.':
        'The Second Amendment governs voting access in federal elections rather than private firearm possession.',
    },
  },
  'ap-usg-u3-054': {
    answer: 'Courts balance personal privacy against a compelling safety interest under the specific facts.',
    distractorReplacements: {
      'A government interest in public safety automatically eliminates every constitutional protection a person might raise.':
        'A government interest in public safety routinely overrides any constitutional protection a person might raise.',
      'Individual rights become relevant only in the cases where the government can identify no interest of its own.':
        'Individual rights carry weight primarily in cases where the government identifies no public interest of its own.',
      'The Fourth Amendment applies only to searches by private businesses and never to actions by government officers.':
        'The Fourth Amendment governs searches by private businesses rather than actions taken by government officers.',
    },
  },
  'ap-usg-u3-055': {
    prompt: 'How does the constitutional doctrine of selective incorporation operate?',
    answer: 'The Supreme Court applies specific Bill of Rights protections to states via the Fourteenth Amendment.',
  },
  'ap-usg-u3-056': {
    answer: 'Notice of charges and a fair hearing through lawful procedures',
  },
  'ap-usg-u3-057': {
    answer: 'Though unnamed in a single clause, the Court has inferred privacy protections from multiple guarantees.',
  },
  'ap-usg-u3-058': {
    answer: 'State-mandated school segregation violated the Fourteenth Amendment Equal Protection Clause.',
  },
  'ap-usg-u3-059': {
    answer: 'Congress enacts a statute barring discrimination in workplaces and public venues.',
  },
  'ap-usg-u3-060': {
    answer: 'Constitutional guarantees and judicial review shield minority liberties from unlawful action.',
    distractorReplacements: {
      'Majorities are never allowed to take part in the elections that decide questions of public policy.':
        'Majorities are barred from participating in elections that decide contested questions of public policy.',
      'Constitutional rights apply only to elected officials and not to the citizens they represent.':
        'Constitutional rights protect elected officials rather than the ordinary citizens they represent.',
    },
  },
  'ap-usg-u3-061': {
    answer: 'Whether policies addressing disparities satisfy Equal Protection limits on classifications',
  },
  'ap-usg-u3-062': {
    answer: 'Evidence showing peaceful expression caused no material disruption or safety threat',
  },
  'ap-usg-u4-064': {
    answer: 'Shared values concerning individual rights, equality, civic engagement, and limited power',
  },
  'ap-usg-u4-066': {
    answer: 'Social contexts shape the experiences and groups forming political views.',
  },
  'ap-usg-u4-067': {
    answer: 'It can shift how voters weigh official responsibility, security, and priorities.',
    distractorReplacements: {
      'It automatically causes every citizen in the country to adopt one identical ideology.':
        'It uniformly leads every citizen in the country to adopt one identical ideology.',
      'It affects only local elections and never reaches the national policy debates that follow.':
        'It shapes local elections without influencing the national policy debates that follow.',
    },
  },
  'ap-usg-u4-068': {
    answer: 'A probability sample giving target residents a known selection chance',
    distractorReplacements: {
      'A sample made up entirely of the pollster’s own friends, family, and neighbors':
        'A sample drawn strictly from the pollster’s own friends, family, and neighbors',
      'A question asked only of people who already agree with the poll’s conclusion':
        'A question posed specifically to people who already share the poll’s conclusion',
    },
  },
  'ap-usg-u4-069': {
    answer: 'True support plausibly falls between about 47 and 55 percent under poll assumptions.',
  },
  'ap-usg-u4-070': {
    answer: 'Democratic platforms generally align with liberal views, and Republican platforms with conservative views.',
  },
  'ap-usg-u4-071': {
    answer: 'Evidence showing cross-state scope, constitutional authority, and consistent policy results',
  },
  'ap-usg-u4-073': {
    answer: 'Assigning greater discretion over certain social issues to state governments',
  },
  'ap-usg-u4-074': {
    answer: 'A steady upward trend in support across the four weeks',
  },
  'ap-usg-u4-075': {
    answer: 'Self-selection overrepresents motivated visitors rather than the wider public.',
  },
  'ap-usg-u5-077': {
    answer: 'Older citizens generally vote at higher rates than younger citizens.',
    distractorReplacements: {
      'Turnout is always identical across age groups.':
        'Turnout stays uniform across every age cohort.',
      'Turnout is determined only by the number of political parties.':
        'Turnout depends strictly on the number of active parties.',
    },
  },
  'ap-usg-u5-078': {
    answer: 'They recruit candidates, mobilize voters, draft platforms, and organize coalitions.',
  },
  'ap-usg-u5-079': {
    answer: 'Updating positions helps build winning coalitions and reflect new priorities.',
  },
  'ap-usg-u5-080': {
    answer: 'Winner-take-all plurality rules and ballot hurdles limit seat and electoral wins.',
  },
  'ap-usg-u5-081': {
    answer: 'Supplying policy research and sharing views with lawmakers on bills',
  },
  'ap-usg-u5-082': {
    answer: 'Concentrated resources, expertise, motivated members, or access can amplify its voice.',
    distractorReplacements: {
      'Influence is determined only by the total number of people who hold membership in the group.':
        'Influence depends strictly on the total number of people who hold membership in the group.',
      'A small group automatically controls the outcome of every election that is held in its state.':
        'A small group routinely controls the outcome of every election that is held in its state.',
    },
  },
  'ap-usg-u5-083': {
    answer: 'It allocates state electoral votes to decide presidential winners constitutionally.',
  },
  'ap-usg-u5-084': {
    answer: 'Name recognition, constituent service, donor networks, and media visibility help them.',
  },
  'ap-usg-u5-085': {
    answer: 'Relying on consultants, polling, targeted outreach, fundraising, and media plans',
  },
  'ap-usg-u5-086': {
    answer: 'An independent-expenditure committee may spend freely without coordinating with candidates.',
    distractorReplacements: {
      'A traditional political action committee may never communicate with voters or with any federal candidate.':
        'A traditional political action committee is barred from communicating with voters or federal candidates.',
      'Both kinds of organization are entirely exempt from all disclosure requirements and campaign-finance rules.':
        'Both kinds of organization are wholly exempt from federal disclosure requirements and campaign-finance rules.',
    },
  },
  'ap-usg-u5-088': {
    answer: 'Audiences gain broad choices alongside selective exposure that reinforces prior views.',
    distractorReplacements: {
      'Media fragmentation eliminates political participation entirely by making news too difficult to follow.':
        'Media fragmentation halts political participation broadly by making news too difficult to follow.',
      'A larger number of media choices guarantees that every claim that citizens encounter has been verified.':
        'A larger number of media choices ensures that every claim citizens encounter has been verified.',
    },
  },
  'ap-usg-u5-090': {
    answer: 'Offering accessible automatic or same-day registration options',
  },
  'ap-usg-u5-091': {
    answer: 'Blending varied interests into one governing agenda',
  },
  'ap-usg-u5-092': {
    answer: 'Support shifted across cohorts, though the chart cannot prove what caused it.',
  },
  'ap-usg-u5-093': {
    answer: 'Drawing votes away may act as a spoiler and alter the state outcome.',
  },
  'ap-usg-u5-094': {
    answer: 'Offer legal arguments or context to inform the justices’ review.',
  },
  'ap-usg-u5-095': {
    answer: 'Diverse groups can align around a single shared policy objective.',
  },
  'ap-usg-u5-097': {
    distractorReplacements: {
      'A guarantee that all incumbents will win future elections':
        'Certainty that sitting members will win future races',
      'A proof that voters never evaluate policy positions':
        'Proof that voters disregard policy platforms in races',
    },
  },
  'ap-usg-u5-098': {
    answer: 'They can sharpen messaging and fundraising while raising costs and limiting candidate autonomy.',
    distractorReplacements: {
      'They guarantee that voters will support the candidate regardless of which policy positions a campaign takes up.':
        'They assure voter backing for the candidate regardless of which policy positions a campaign takes up.',
      'They make political parties and organized interest groups entirely irrelevant to the conduct of modern elections.':
        'They render political parties and organized interest groups wholly irrelevant to the conduct of modern elections.',
    },
  },
  'ap-usg-u5-099': {
    answer: 'How undisclosed donors may shape the message’s perspective and credibility',
  },
  'ap-usg-u5-100': {
    answer: 'Agenda setting by elevating the issue’s salience for the public',
  },
};
