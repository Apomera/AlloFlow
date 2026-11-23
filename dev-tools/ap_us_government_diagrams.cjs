'use strict';

// Original, text-first accessible concept-flow diagrams (alloflow-diagram-v1)
// for AP U.S. Government and Politics (1 per unit, 5 total).
// Optional study aids; not official College Board figures; unscored and release-blocked.

const AP_US_GOV_DIAGRAM_SPECS = [
  {
    unitNumber: 1,
    domainId: 'foundations-of-american-democracy',
    sectionIndex: 1,
    title: 'Constitutional separation of powers, checks and balances, and federalism flow',
    learnerPurpose: 'Trace how democratic theory, constitutional separation of powers, and federal-state authority shape policy access and institutional constraints.',
    caption: 'An original AP U.S. Government Unit 1 concept flow linking participatory ideals, separated branches, checks and balances, and federal-state power sharing.',
    shortAlt: 'Four-step flow from Enlightenment democratic ideals to constitutional separation of powers, interbranch checks, and federal-state federalism.',
    nodes: [
      {
        id: 'ideals',
        label: 'Democratic ideals and limited government',
        detail: 'Natural rights, popular sovereignty, and social-contract theory justify representative government constrained by written constitutional rules.',
      },
      {
        id: 'separation',
        label: 'Separation of powers across three branches',
        detail: 'Articles I, II, and III vest lawmaking in Congress, execution in the presidency, and judicial power in independent federal courts to prevent faction tyranny.',
      },
      {
        id: 'checks',
        label: 'Checks, balances, and institutional friction',
        detail: 'Vetoes, overrides, Senate confirmation, appropriations, and judicial review force compromise and give each branch constitutional means to resist encroachment.',
      },
      {
        id: 'federalism',
        label: 'Federalism and multiple policy access points',
        detail: 'Enumerated, implied, reserved, and concurrent powers—mediated by the Supremacy Clause, Commerce Clause, and grants-in-aid—divide authority between nation and states.',
      },
    ],
    edges: [
      { id: 'ideals-to-separation', from: 'ideals', to: 'separation', label: 'justify structural limits through' },
      { id: 'separation-to-checks', from: 'separation', to: 'checks', label: 'requires mutual accountability via' },
      { id: 'checks-to-federalism', from: 'checks', to: 'federalism', label: 'pairs horizontal limits with vertical' },
    ],
  },
  {
    unitNumber: 2,
    domainId: 'interactions-among-branches',
    sectionIndex: 2,
    title: 'Lawmaking, executive implementation, bureaucratic rulemaking, and judicial review flow',
    learnerPurpose: 'Follow how public policy moves from congressional legislation through presidential action, bureaucratic rulemaking, and constitutional judicial review.',
    caption: 'An original AP U.S. Government Unit 2 concept flow illustrating interbranch policy development, implementation, and oversight.',
    shortAlt: 'Four-step flow from congressional legislation to presidential action, bureaucratic implementation, and judicial review plus oversight.',
    nodes: [
      {
        id: 'congress',
        label: 'Congressional committees, chambers, and floor action',
        detail: 'House rules and Senate debate norms shape bills through committees, amendments, and bicameral conference compromises before passage.',
      },
      {
        id: 'presidency',
        label: 'Presidential approval, veto, or executive direction',
        detail: 'The president signs or vetoes legislation, nominates agency leaders and judges, and uses the bully pulpit and executive orders within statutory bounds.',
      },
      {
        id: 'bureaucracy',
        label: 'Bureaucratic rulemaking and discretionary enforcement',
        detail: 'Executive departments and independent agencies translate broad statutes into binding regulations, monitor compliance, and answer to congressional oversight.',
      },
      {
        id: 'judiciary',
        label: 'Judicial review and constitutional boundaries',
        detail: 'Federal courts interpret statutes and review constitutional challenges under Marbury v. Madison and stare decisis while relying on other branches for enforcement.',
      },
    ],
    edges: [
      { id: 'congress-to-presidency', from: 'congress', to: 'presidency', label: 'presents passed legislation for' },
      { id: 'presidency-to-bureaucracy', from: 'presidency', to: 'bureaucracy', label: 'directs execution and appointments in' },
      { id: 'bureaucracy-to-judiciary', from: 'bureaucracy', to: 'judiciary', label: 'faces constitutional and statutory review by' },
    ],
  },
  {
    unitNumber: 3,
    domainId: 'civil-liberties-and-civil-rights',
    sectionIndex: 1,
    title: 'Bill of Rights, selective incorporation, and equal protection scrutiny flow',
    learnerPurpose: 'Distinguish civil liberties from civil rights and trace how the Fourteenth Amendment extends constitutional protections against state and federal action.',
    caption: 'An original AP U.S. Government Unit 3 concept flow connecting constitutional rights, selective incorporation, judicial balancing, and equal protection.',
    shortAlt: 'Four-step flow from Bill of Rights text through Fourteenth Amendment selective incorporation, judicial balancing tests, and civil rights remedies.',
    nodes: [
      {
        id: 'rights-text',
        label: 'Bill of Rights guarantees and limits',
        detail: 'Amendments I through VIII protect speech, religion, press, assembly, due process, and accused-person safeguards primarily against government infringement.',
      },
      {
        id: 'incorporation',
        label: 'Selective incorporation via the Fourteenth Amendment',
        detail: 'Case by case through the Due Process Clause, the Supreme Court applied most fundamental Bill of Rights liberties to state and local governments.',
      },
      {
        id: 'balancing',
        label: 'Judicial balancing of liberty and public order',
        detail: 'Courts apply tailored standards—such as time, place, and manner limits or compelling-interest review—to separate protected expression from unprotected conduct.',
      },
      {
        id: 'equal-protection',
        label: 'Equal protection, legislation, and social movements',
        detail: 'Civic advocacy, landmark statutes like the Civil Rights Act and Voting Rights Act, and Equal Protection jurisprudence challenge discriminatory classifications.',
      },
    ],
    edges: [
      { id: 'rights-to-incorporation', from: 'rights-text', to: 'incorporation', label: 'extends to state action through' },
      { id: 'incorporation-to-balancing', from: 'incorporation', to: 'balancing', label: 'requires constitutional boundary tests via' },
      { id: 'balancing-to-equal-protection', from: 'balancing', to: 'equal-protection', label: 'complements antidiscrimination claims under' },
    ],
  },
  {
    unitNumber: 4,
    domainId: 'american-political-ideologies-and-beliefs',
    sectionIndex: 1,
    title: 'Political socialization, opinion polling quality, and ideological policy alignment flow',
    learnerPurpose: 'Connect how citizens form political beliefs to how pollsters measure opinion accurately and how ideologies frame economic and social policy.',
    caption: 'An original AP U.S. Government Unit 4 concept flow linking political socialization, scientific polling, ideological frameworks, and policy debates.',
    shortAlt: 'Four-step flow from political socialization and core values to scientific polling methodology, ideological frameworks, and fiscal or social policy choices.',
    nodes: [
      {
        id: 'socialization',
        label: 'Political socialization and generational events',
        detail: 'Family, schools, peers, media ecosystems, and major historical events shape enduring attitudes toward individualism, equality of opportunity, and rule of law.',
      },
      {
        id: 'polling',
        label: 'Scientific polling and sampling validity',
        detail: 'Random probability sampling, neutral question wording, transparent weighting, and reported margin of error determine whether survey data reflect public opinion.',
      },
      {
        id: 'ideology',
        label: 'Liberal, conservative, and libertarian frameworks',
        detail: 'Competing ideologies weigh federal regulation, social safety nets, individual liberty, and market freedom differently when diagnosing public problems.',
      },
      {
        id: 'policy',
        label: 'Economic and social policymaking trade-offs',
        detail: 'Ideological coalitions influence congressional fiscal policy (taxing and spending), Federal Reserve monetary decisions, and social-policy priorities.',
      },
    ],
    edges: [
      { id: 'socialization-to-polling', from: 'socialization', to: 'polling', label: 'forms public attitudes measured by' },
      { id: 'polling-to-ideology', from: 'polling', to: 'ideology', label: 'reveals group patterns organized into' },
      { id: 'ideology-to-policy', from: 'ideology', to: 'policy', label: 'guides competing priorities in' },
    ],
  },
  {
    unitNumber: 5,
    domainId: 'political-participation',
    sectionIndex: 2,
    title: 'Voting models, linkage institutions, campaign finance, and electoral outcomes flow',
    learnerPurpose: 'Trace how voters, parties, interest groups, media, and election rules convert public participation into governing representation.',
    caption: 'An original AP U.S. Government Unit 5 concept flow connecting voter behavior, linkage institutions, campaign rules, and electoral outcomes.',
    shortAlt: 'Four-step flow from voter turnout and decision models through linkage institutions, campaign rules and Electoral College structure, to policy responsiveness.',
    nodes: [
      {
        id: 'voting',
        label: 'Voting rights, turnout factors, and choice models',
        detail: 'Constitutional amendments, registration rules, demographics, political efficacy, and rational-choice, retrospective, prospective, or party-line cues drive turnout and votes.',
      },
      {
        id: 'linkage',
        label: 'Parties, interest groups, and media ecosystems',
        detail: 'Political parties recruit candidates and build platforms, interest groups lobby and file amicus briefs, and news media set agendas and frame public debate.',
      },
      {
        id: 'campaigns',
        label: 'Primaries, campaign finance, and Electoral College',
        detail: 'Open or closed primaries, PAC and super PAC spending rules, winner-take-all state allocations, and incumbency shape campaign strategy and competitiveness.',
      },
      {
        id: 'representation',
        label: 'Electoral mandates and institutional responsiveness',
        detail: 'Election outcomes realign governing coalitions and signal voter priorities, while separated institutions mediate how rapidly public preferences become law.',
      },
    ],
    edges: [
      { id: 'voting-to-linkage', from: 'voting', to: 'linkage', label: 'channels citizen participation through' },
      { id: 'linkage-to-campaigns', from: 'linkage', to: 'campaigns', label: 'mobilizes voters and resources inside' },
      { id: 'campaigns-to-representation', from: 'campaigns', to: 'representation', label: 'translates ballot rules into' },
    ],
  },
];

function buildApUsGovernmentDiagrams(chapters, references) {
  const refs = Array.isArray(references) && references.length ? references : [];
  const diagrams = AP_US_GOV_DIAGRAM_SPECS.map((spec, index) => {
    const chapter = chapters[index];
    const textEquivalent = spec.nodes.map((node) => `${node.label}: ${node.detail}`);
    return {
      id: `ap-usg-diagram-${String(spec.unitNumber).padStart(2, '0')}`,
      chapterId: chapter.id,
      domainId: spec.domainId,
      title: spec.title,
      type: 'optional-concept-flow',
      diagramType: 'directed-concept-flow',
      learnerPurpose: spec.learnerPurpose,
      caption: spec.caption,
      unscored: true,
      officialItem: false,
      releaseEligible: false,
      reviewStatus: 'source-reviewed-editorial-pass',
      expertReviewStatus: 'pending',
      references: refs.slice(),
      rights: {
        originalSpecification: true,
        officialFigureReproduced: false,
        sourceFigureReproduced: false,
        thirdPartyArtworkIncluded: false,
      },
      accessibility: {
        essentialVisualContent: false,
        shortAlt: spec.shortAlt,
        longDescription: `Read from left to right. ${spec.nodes.map((node) => node.detail).join(' ')}`,
        textEquivalent,
        readingOrder: spec.nodes.map((node) => node.id),
        colorIndependent: true,
        shapeIndependentLabels: true,
        fallbackMode: 'ordered-text-equivalent',
        independentReviewStatus: 'pending',
      },
      spec: {
        format: 'alloflow-diagram-v1',
        layout: 'left-to-right',
        nodes: spec.nodes,
        edges: spec.edges,
        renderingHints: {
          connectorStyle: 'arrow',
          allowHorizontalScroll: true,
          minimumTextSize: 'user-scalable',
        },
      },
    };
  });

  const diagramPlacements = AP_US_GOV_DIAGRAM_SPECS.map((spec, index) => {
    const chapter = chapters[index];
    const section = chapter.sections[spec.sectionIndex] || chapter.sections[0];
    return {
      id: `ap-usg-diagram-placement-${String(spec.unitNumber).padStart(2, '0')}`,
      diagramId: diagrams[index].id,
      chapterId: chapter.id,
      sectionId: section.id,
      position: 'after-section-content',
      learnerPurpose: spec.learnerPurpose,
      requiredForComprehension: false,
      unscored: true,
      fallbackMode: 'diagram-text-equivalent',
      reviewStatus: 'source-reviewed-editorial-pass',
      accessibilityReviewStatus: 'pending-independent-review',
      releaseEligible: false,
    };
  });

  return { diagrams, diagramPlacements };
}

module.exports = { AP_US_GOV_DIAGRAM_SPECS, buildApUsGovernmentDiagrams };
