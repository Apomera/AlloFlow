'use strict';

const fs = require('fs');
const path = require('path');

const { eppp_part_1: EPPP_QUICK_REF } = require('../learning_library_quick_ref/eppp_quick_ref_8.cjs');
const { eppp_part_1: EPPP_PLAYBOOKS } = require('../learning_library_playbooks/eppp_playbooks_8.cjs');
const { eppp_part_1: EPPP_WORKSHOPS } = require('../learning_library_workshops/eppp_workshops_8.cjs');

const ASPPB_DOMAINS = [
  {
    id: 'biological',
    label: 'Biological Bases of Behavior',
    weightPct: 10,
    formQuota: 6,
    libraryDomainNumber: 4,
    leadChapterId: 'ch-20',
    chapterIds: ['ch-20', 'ch-21', 'ch-22', 'ch-23', 'ch-49'],
  },
  {
    id: 'cognitive-affective',
    label: 'Cognitive-Affective Bases of Behavior',
    weightPct: 13,
    formQuota: 8,
    libraryDomainNumber: 5,
    leadChapterId: 'ch-24',
    chapterIds: ['ch-24', 'ch-25', 'ch-26', 'ch-27', 'ch-28', 'ch-29'],
  },
  {
    id: 'social-cultural',
    label: 'Social and Cultural Bases of Behavior',
    weightPct: 11,
    formQuota: 7,
    libraryDomainNumber: 6,
    leadChapterId: 'ch-30',
    chapterIds: ['ch-30', 'ch-31', 'ch-32', 'ch-33', 'ch-34'],
  },
  {
    id: 'lifespan',
    label: 'Growth and Lifespan Development',
    weightPct: 12,
    formQuota: 7,
    libraryDomainNumber: 7,
    leadChapterId: 'ch-35',
    chapterIds: ['ch-35', 'ch-36', 'ch-37', 'ch-38', 'ch-39'],
  },
  {
    id: 'assessment',
    label: 'Assessment and Diagnosis',
    weightPct: 16,
    formQuota: 10,
    libraryDomainNumber: 1,
    leadChapterId: 'ch-1',
    chapterIds: ['ch-1', 'ch-2', 'ch-3', 'ch-4', 'ch-5', 'ch-6'],
  },
  {
    id: 'intervention',
    label: 'Treatment, Intervention, Prevention, and Supervision',
    weightPct: 15,
    formQuota: 9,
    libraryDomainNumber: 3,
    leadChapterId: 'ch-13',
    chapterIds: ['ch-13', 'ch-14', 'ch-15', 'ch-16', 'ch-17', 'ch-18', 'ch-19'],
  },
  {
    id: 'research',
    label: 'Research Methods and Statistics',
    weightPct: 7,
    formQuota: 4,
    libraryDomainNumber: 8,
    leadChapterId: 'ch-40',
    chapterIds: ['ch-40', 'ch-41', 'ch-42', 'ch-43', 'ch-44', 'ch-45'],
  },
  {
    id: 'professional',
    label: 'Ethical, Legal, and Professional Issues',
    weightPct: 16,
    formQuota: 9,
    libraryDomainNumber: 2,
    leadChapterId: 'ch-7',
    chapterIds: ['ch-7', 'ch-8', 'ch-9', 'ch-10', 'ch-11', 'ch-12'],
  },
];

const CURATED_EPPP_SOURCES = [
  {
    id: 'eppp-source-asppb-overview',
    url: 'https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/',
    sourceType: 'official-blueprint',
    fallbackTitle: 'Examination for Professional Practice in Psychology (EPPP)',
    fallbackOrg: 'Association of State and Provincial Psychology Boards (ASPPB)',
  },
  {
    id: 'eppp-source-asppb-topics',
    url: 'https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/eppp-exam-topics/',
    sourceType: 'official-blueprint',
    fallbackTitle: 'EPPP Exam Topics and Content Domain Weights',
    fallbackOrg: 'Association of State and Provincial Psychology Boards (ASPPB)',
  },
  {
    id: 'eppp-source-asppb-handbook',
    url: 'https://asppb.net/wp-content/uploads/EPPP-Candidate-Handbook_01.2026.pdf',
    sourceType: 'official-blueprint',
    fallbackTitle: 'EPPP Candidate Handbook (January 2026)',
    fallbackOrg: 'Association of State and Provincial Psychology Boards (ASPPB)',
  },
  {
    id: 'eppp-source-asppb-future-2027',
    url: 'https://asppb.net/future-eppp-content-areas-2027/',
    sourceType: 'official-blueprint',
    fallbackTitle: 'Future EPPP Content Areas (2027 Transition Notice)',
    fallbackOrg: 'Association of State and Provincial Psychology Boards (ASPPB)',
  },
  {
    id: 'eppp-source-apa-ethics-code',
    url: 'https://www.apa.org/ethics/code',
    sourceType: 'professional-standards',
    fallbackTitle: 'Ethical Principles of Psychologists and Code of Conduct',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-assessment-guidelines',
    url: 'https://www.apa.org/about/policy/guidelines-psychological-assessment-evaluation.pdf',
    sourceType: 'professional-standards',
    fallbackTitle: 'APA Guidelines for Psychological Assessment and Evaluation',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-ebpp',
    url: 'https://www.apa.org/practice/guidelines/evidence-based-statement.html',
    sourceType: 'professional-standards',
    fallbackTitle: 'Policy Statement on Evidence-Based Practice in Psychology',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-supervision',
    url: 'https://www.apa.org/about/policy/guidelines-supervision.pdf',
    sourceType: 'professional-standards',
    fallbackTitle: 'Guidelines for Clinical Supervision in Health Service Psychology',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-multicultural',
    url: 'https://www.apa.org/about/policy/multicultural-guidelines',
    sourceType: 'professional-standards',
    fallbackTitle: 'APA Multicultural Guidelines: An Ecological Approach to Context, Identity, and Intersectionality',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-forensic',
    url: 'https://www.apa.org/practice/guidelines/forensic-psychology',
    sourceType: 'professional-standards',
    fallbackTitle: 'Specialty Guidelines for Forensic Psychology',
    fallbackOrg: 'American Psychological Association and American Academy of Forensic Psychology',
  },
  {
    id: 'eppp-source-apa-telepsychology',
    url: 'https://www.apa.org/practice/guidelines/telepsychology',
    sourceType: 'professional-standards',
    fallbackTitle: 'Guidelines for the Practice of Telepsychology',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-record-keeping',
    url: 'https://www.apa.org/practice/guidelines/record-keeping',
    sourceType: 'professional-standards',
    fallbackTitle: 'Record Keeping Guidelines',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-ptsd',
    url: 'https://www.apa.org/ptsd-guideline',
    sourceType: 'professional-standards',
    fallbackTitle: 'Clinical Practice Guideline for the Treatment of PTSD in Adults',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-apa-jars-quant',
    url: 'https://apastyle.apa.org/jars/quantitative',
    sourceType: 'professional-standards',
    fallbackTitle: 'Journal Article Reporting Standards for Quantitative Research (JARS-Quant)',
    fallbackOrg: 'American Psychological Association',
  },
  {
    id: 'eppp-source-dsm5tr-cfi',
    url: 'https://www.psychiatry.org/getmedia/5cc5329d-3bd4-4c6a-bae1-dfd0d6496f44/APA-DSM5TR-CulturalFormulationInterview.pdf',
    sourceType: 'evidence-reference',
    fallbackTitle: 'DSM-5-TR Cultural Formulation Interview',
    fallbackOrg: 'American Psychiatric Association',
  },
  {
    id: 'eppp-source-hhs-hipaa-subpoena',
    url: 'https://www.hhs.gov/hipaa/for-professionals/faq/706/what-satisfactory-assurances-must-a-covered-entity-receive-before-it-responds-to-a-subpoena/index.html',
    sourceType: 'federal-guidance',
    fallbackTitle: 'HIPAA Satisfactory Assurances for Responding to a Subpoena Without a Court Order',
    fallbackOrg: 'U.S. Department of Health and Human Services',
  },
  {
    id: 'eppp-source-nimh-bssa',
    url: 'https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials/adult-outpatient/adult-outpatient-brief-suicide-safety-assessment-guide',
    sourceType: 'federal-guidance',
    fallbackTitle: 'Adult Outpatient Brief Suicide Safety Assessment Guide',
    fallbackOrg: 'National Institute of Mental Health, National Institutes of Health',
  },
  {
    id: 'eppp-source-samhsa-crisis',
    url: 'https://library.samhsa.gov/product/national-behavioral-health-crisis-care-guidance/pep24-01-037',
    sourceType: 'federal-guidance',
    fallbackTitle: 'National Behavioral Health Crisis Care Guidance (PEP24-01-037)',
    fallbackOrg: 'Substance Abuse and Mental Health Services Administration (SAMHSA)',
  },
  {
    id: 'eppp-source-nia-aging',
    url: 'https://www.nia.nih.gov/health/health-care-professionals-information/assessing-cognitive-impairment-older-patients',
    sourceType: 'federal-guidance',
    fallbackTitle: 'Assessing Cognitive Impairment in Older Patients',
    fallbackOrg: 'National Institute on Aging, National Institutes of Health',
  },
  {
    id: 'eppp-source-nidcd-aphasia',
    url: 'https://www.nidcd.nih.gov/health/aphasia',
    sourceType: 'federal-guidance',
    fallbackTitle: 'NIDCD Health Information: Aphasia',
    fallbackOrg: 'National Institute on Deafness and Other Communication Disorders, National Institutes of Health',
  },
];

function cleanSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildEpppStudyLayers({ root, chapters, referenceCatalog }) {
  const packPath = path.join(root, 'test_prep', 'eppp_part_one_pack.json');
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const items = Array.isArray(pack.items) ? pack.items : [];
  const validItemIds = new Set(items.map((it) => it && it.id).filter(Boolean));
  const chapterById = new Map((chapters || []).map((ch) => [ch.id, ch]));

  const itemsByDomain = new Map();
  for (const dom of ASPPB_DOMAINS) itemsByDomain.set(dom.id, []);
  for (const it of items) {
    if (!it || !it.id || !itemsByDomain.has(it.domainId)) continue;
    itemsByDomain.get(it.domainId).push(it.id);
  }

  for (const dom of ASPPB_DOMAINS) {
    if (!chapterById.has(dom.leadChapterId)) {
      throw new Error(`EPPP study layers missing lead chapter ${dom.leadChapterId} for domain ${dom.id}.`);
    }
    if ((itemsByDomain.get(dom.id) || []).length < 60) {
      throw new Error(`EPPP domain ${dom.id} has fewer than 60 pack items.`);
    }
  }

  // Validate Quick Reference, Playbooks, Workshops
  if (!Array.isArray(EPPP_QUICK_REF) || EPPP_QUICK_REF.length !== 8) {
    throw new Error('EPPP quick reference module must provide exactly 8 domain cards.');
  }
  const families = EPPP_PLAYBOOKS.misconceptionFamilies || [];
  const playbooks = EPPP_PLAYBOOKS.misconceptionRemediationPlaybooks || [];
  if (families.length !== 8 || playbooks.length !== 8) {
    throw new Error('EPPP playbooks module must provide 8 families and 8 remediation playbooks.');
  }
  for (const fam of families) {
    for (const id of fam.itemIds || []) {
      if (!validItemIds.has(id)) {
        throw new Error(`EPPP misconception family ${fam.id} references unknown itemId ${id}.`);
      }
    }
  }
  const workshops = EPPP_WORKSHOPS.workshops || [];
  if (workshops.length !== 8) {
    throw new Error('EPPP workshops module must provide 8 domain-aligned applied case workshops.');
  }

  // 1. Unit / Domain Review Routes (8 official ASPPB domains)
  const unitReviewRoutes = ASPPB_DOMAINS.map((dom, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const domItems = itemsByDomain.get(dom.id);
    const domainRouteItems = domItems.slice(0, 45);
    const mixedPracticeItemIds = domItems.slice(0, 15);
    const chTitles = dom.chapterIds
      .map((cid) => chapterById.get(cid))
      .filter(Boolean)
      .map((c) => c.title);
    const sectionIds = dom.chapterIds
      .flatMap((cid) => ((chapterById.get(cid) || {}).sections || []).map((s) => s.id))
      .filter(Boolean);

    return {
      id: `eppp-domain-review-${num}-${dom.id}`,
      unitId: dom.id,
      unitNumber: idx + 1,
      unitLabel: `Domain ${idx + 1} (${dom.weightPct}%): ${dom.label}`,
      chapterId: dom.leadChapterId,
      topicDiagnosticRouteIds: sectionIds.slice(0, 20),
      itemIds: domainRouteItems,
      mixedPracticeItemIds,
      purpose: cleanSpaces(
        `Consolidate ${dom.label} (${dom.weightPct}% ASPPB Part 1 weight) across ${dom.chapterIds.length} chapters (${chTitles.slice(0, 3).join('; ')}${chTitles.length > 3 ? '; and companion chapters' : ''}) with ${domainRouteItems.length} source-reviewed practice items.`
      ),
      status: 'internal-unit-review-route',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    };
  });

  // Helper to pull blueprint-weighted slices across all 8 domains (60 items total per slice)
  function pullWeightedSlice(sliceOffset) {
    const picked = [];
    for (const dom of ASPPB_DOMAINS) {
      const pool = itemsByDomain.get(dom.id);
      const start = sliceOffset * dom.formQuota;
      for (let i = 0; i < dom.formQuota; i++) {
        const idx = (start + i) % pool.length;
        picked.push(pool[idx]);
      }
    }
    return picked;
  }

  // 2. Cumulative Review Ladders (3 progressive 60-item tiers across all 8 domains = 180 distinct items)
  const ladder1Items = pullWeightedSlice(0);
  const ladder2Items = pullWeightedSlice(1);
  const ladder3Items = pullWeightedSlice(2);

  const reviewLadders = [
    {
      id: 'eppp-ladder-01-foundation',
      order: 1,
      label: 'Tier 1: Foundation Mechanisms, Psychometrics & Ethics Rules',
      studyMode: 'foundation',
      purpose:
        'Verify core mechanisms, DSM-5-TR thresholds, psychometric formulas, and APA Ethics Code standards across all eight ASPPB Part 1 domains weighted to the official blueprint.',
      focus: [
        'Assessment and Diagnosis (16%)',
        'Ethical, Legal, and Professional Issues (16%)',
        'Treatment, Intervention, Prevention, and Supervision (15%)',
        'Cognitive-Affective Bases of Behavior (13%)',
      ],
      itemIds: ladder1Items,
      status: 'internal-review-ladder',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-ladder-02-clinical-synthesis',
      order: 2,
      label: 'Tier 2: Differential Diagnosis, Intervention & Trap Repair',
      studyMode: 'application',
      purpose:
        'Apply cross-domain clinical judgment to base-rate screening, psychopharmacology safety, multicultural formulation, lifespan differentials, and supervision or forensic boundaries.',
      focus: playbooks.slice(0, 4).map((p) => p.familyLabel),
      itemIds: ladder2Items,
      status: 'internal-review-ladder',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-ladder-03-cumulative-transfer',
      order: 3,
      label: 'Tier 3: Cumulative EPPP Part 1 Cross-Domain Transfer',
      studyMode: 'cumulative-transfer',
      purpose:
        'Synthesize novel, multi-constraint vignettes across all eight ASPPB Part 1 domains under timed retrieval before attempting a full blueprint-weighted internal practice form.',
      focus: [
        'Growth and Lifespan Development (12%)',
        'Social and Cultural Bases of Behavior (11%)',
        'Biological Bases of Behavior (10%)',
        'Research Methods and Statistics (7%)',
      ],
      itemIds: ladder3Items,
      status: 'internal-review-ladder',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ];

  // 3. Disjoint Blueprint-Weighted Internal Practice Forms (A, B, C: 60 items each = 180 non-overlapping items)
  // Start at sliceOffset 3, 4, 5 so forms do not even overlap the 3 ladders!
  const formAItems = pullWeightedSlice(3);
  const formBItems = pullWeightedSlice(4);
  const formCItems = pullWeightedSlice(5);
  const unionForms = new Set([...formAItems, ...formBItems, ...formCItems]);
  if (unionForms.size !== 180) {
    throw new Error(`EPPP practice forms A/B/C overlap detected (${unionForms.size} unique of 180).`);
  }

  const allDomainIds = ASPPB_DOMAINS.map((d) => d.id);
  const practiceForms = [
    {
      id: 'eppp-practice-form-a',
      title: 'EPPP Part 1 Internal Practice Form A (60 items, Blueprint-Weighted)',
      formType: 'internal-selected-response-form',
      purpose:
        'Non-overlapping 60-item internal baseline benchmark proportionally weighted to all eight ASPPB Part 1 domains. Independent study benchmark; not a calibrated or official ASPPB exam score.',
      unitIds: allDomainIds,
      topicIds: allDomainIds,
      itemIds: formAItems,
      status: 'internal-practice-form',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-practice-form-b',
      title: 'EPPP Part 1 Internal Practice Form B (60 items, Blueprint-Weighted)',
      formType: 'internal-selected-response-form',
      purpose:
        'Second disjoint 60-item blueprint-weighted form for post-remediation check-in after completing targeted misconception playbooks and applied clinical case workshops.',
      unitIds: allDomainIds,
      topicIds: allDomainIds,
      itemIds: formBItems,
      status: 'internal-practice-form',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-practice-form-c',
      title: 'EPPP Part 1 Internal Practice Form C (60 items, Blueprint-Weighted)',
      formType: 'internal-selected-response-form',
      purpose:
        'Third disjoint 60-item blueprint-weighted dress-rehearsal set for pacing, clinical stamina, and final weak-domain triage. Scores are internal practice metrics only.',
      unitIds: allDomainIds,
      topicIds: allDomainIds,
      itemIds: formCItems,
      status: 'internal-practice-form',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ];

  // 4. Guided Study Sessions (8 domain-launch 45-min blocks + 2 exam-wide sprints = 10 sessions)
  const qrByDom = new Map(EPPP_QUICK_REF.map((q) => [q.domainId, q]));
  const studySessionPlans = ASPPB_DOMAINS.map((dom, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const leadCh = chapterById.get(dom.leadChapterId);
    const qr = qrByDom.get(dom.id);
    const pb = playbooks[idx];
    const ws = workshops[idx];
    const domItems = itemsByDomain.get(dom.id);
    const sessionItems = domItems.slice(12, 24);

    return {
      id: `eppp-session-domain-${num}-${dom.id}`,
      title: `${dom.label} guided study session`,
      sessionType: 'domain-launch',
      purpose: cleanSpaces(
        `Move through ${dom.label} (${dom.weightPct}% blueprint weight) from core textbook chapters and Quick Reference anchors to applied clinical case reasoning, 12-item retrieval, and misconception repair in one 45-minute block.`
      ),
      durationMinutes: 45,
      chapterId: dom.leadChapterId,
      itemIds: sessionItems,
      steps: [
        {
          id: 'orient',
          label: 'Orient with Quick Reference & lead chapter',
          durationMinutes: 10,
          action: cleanSpaces(
            `Open "${leadCh.title}" and review the "${qr.title}" Quick Reference card checklist and key formulas or standards before reading.`
          ),
        },
        {
          id: 'visual-and-glossary',
          label: 'Trace native diagrams & glossary terms',
          durationMinutes: 10,
          action: cleanSpaces(
            `Inspect the native vector diagrams and expandable clinical cases across ${dom.chapterIds.length} domain chapters (${dom.chapterIds.join(', ')}), verifying unfamiliar terms in the searchable EPPP glossary.`
          ),
        },
        {
          id: 'applied-case',
          label: 'Draft applied clinical case response',
          durationMinutes: 10,
          action: cleanSpaces(
            `Work through the unscored applied case workshop "${ws.title}" without peeking at the sample outline, then check your reasoning against the four success criteria.`
          ),
        },
        {
          id: 'practice-and-repair',
          label: 'Timed domain retrieval & trap repair',
          durationMinutes: 15,
          action: cleanSpaces(
            `Complete the 12 linked ${dom.label} practice items under exam pacing; for any miss, execute the "${pb.title}" misconception playbook and log one concrete check.`
          ),
        },
      ],
      status: 'internal-study-session',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    };
  });

  // Exam-wide Session 9: Trap-Repair Sprint (2 items from each of the 8 misconception families = 16 items)
  const trapSprintItems = [];
  const trapSeen = new Set();
  for (let round = 0; round < 2; round++) {
    for (const fam of families) {
      const id = (fam.itemIds || [])[round];
      if (id && !trapSeen.has(id)) {
        trapSeen.add(id);
        trapSprintItems.push(id);
      }
    }
  }
  studySessionPlans.push({
    id: 'eppp-session-trap-repair-sprint',
    title: 'EPPP high-frequency trap-repair sprint',
    sessionType: 'misconception-repair',
    purpose:
      'Target the 8 highest-frequency EPPP Part 1 clinical, psychometric, statistical, and APA Ethics traps in one focused 40-minute error-repair cycle.',
    durationMinutes: 40,
    chapterId: 'ch-1',
    itemIds: trapSprintItems,
    steps: [
      {
        id: 'audit',
        label: 'Audit recurring error patterns',
        durationMinutes: 8,
        action:
          'Review your recent missed items and match each miss to one of the 8 EPPP misconception playbooks before launching the repair set.',
      },
      {
        id: 'rehearse',
        label: 'Rehearse repair rules across domains',
        durationMinutes: 10,
        action:
          'Read the recognition cue and repair question for your top three weak playbooks and write a one-line decision rule for each.',
      },
      {
        id: 'sprint',
        label: 'Cross-domain trap-repair set',
        durationMinutes: 15,
        action:
          'Complete the 16 linked trap-targeted items (2 per ASPPB domain) without looking at Quick Reference cards, verifying why each distractor fails.',
      },
      {
        id: 'verify',
        label: 'Schedule spaced recheck',
        durationMinutes: 7,
        action:
          'Log any persistent error family for a 72-hour spaced recheck using its domain spaced-review cadence plan.',
      },
    ],
    status: 'internal-study-session',
    reviewStatus: 'source-reviewed-editorial-pass',
    releaseEligible: false,
  });

  // Exam-wide Session 10: Mixed-Domain Capstone (2 items per domain = 16 items, linked to ch-46 strategy chapter)
  const capstoneItems = [];
  for (const dom of ASPPB_DOMAINS) {
    const pool = itemsByDomain.get(dom.id);
    capstoneItems.push(pool[24], pool[25]);
  }
  const strategyChapterId = chapterById.has('ch-46') ? 'ch-46' : 'ch-1';
  studySessionPlans.push({
    id: 'eppp-session-mixed-capstone',
    title: 'EPPP mixed-domain capstone & clinical synthesis',
    sessionType: 'exam-synthesis',
    purpose:
      'Combine test-taking strategy, cross-domain applied case reasoning, and mixed 8-domain selected-response retrieval in a 50-minute capstone block.',
    durationMinutes: 50,
    chapterId: strategyChapterId,
    itemIds: capstoneItems,
    steps: [
      {
        id: 'strategy',
        label: 'Review EPPP pacing & stem strategy',
        durationMinutes: 8,
        action:
          'Skim "EPPP Anatomy & Test-Taking Strategy" (Chapter 46) and your two highest-weight Quick Reference cards (Assessment and Ethical/Legal Issues).',
      },
      {
        id: 'workshop',
        label: 'Complete a cross-domain applied case',
        durationMinutes: 15,
        action:
          'Select one Applied Clinical Case Workshop outside your strongest specialty area, draft a 4-point outline, and audit it against the common pitfalls list.',
      },
      {
        id: 'mixed-set',
        label: 'Timed mixed 8-domain retrieval',
        durationMinutes: 20,
        action:
          'Answer the 16 mixed-domain items (2 per ASPPB domain) at ~75 seconds per item without consulting notes.',
      },
      {
        id: 'calibrate',
        label: 'Calibrate next study step',
        durationMinutes: 7,
        action:
          'Compare accuracy across the 8 domains and pick either a targeted domain review route or your next disjoint 60-item Practice Form (A, B, or C).',
      },
    ],
    status: 'internal-study-session',
    reviewStatus: 'source-reviewed-editorial-pass',
    releaseEligible: false,
  });

  // 5. Spaced-Review Cadence Plans (8 domains, 4 intervals each, direct chapterId link, hyphen-free actions)
  const spacedReviewPlans = ASPPB_DOMAINS.map((dom, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const pb = playbooks[idx];
    const qr = qrByDom.get(dom.id);
    return {
      id: `eppp-spaced-domain-${num}-${dom.id}`,
      unitId: dom.id,
      chapterId: dom.leadChapterId,
      topicLabel: `Domain ${idx + 1}: ${dom.label} (${dom.weightPct}%)`,
      diagnosticRouteId: '',
      cadenceStages: [
        {
          id: 'initial-retrieval',
          label: '24 hour recall check',
          intervalHours: 24,
          action: 'Revisit core chapter flashcards and memory aids from memory',
          completionEvidence: cleanSpaces(
            `Recall the core rules on "${qr.title}" and complete the lead chapter knowledge checks cleanly without notes.`
          ),
        },
        {
          id: 'trap-recheck',
          label: '72 hour trap recheck',
          intervalHours: 72,
          action: 'Run the domain misconception playbook and retry missed stems',
          completionEvidence: cleanSpaces(
            `Pass at least 10 of 12 items linked to "${pb.familyLabel}" while naming why each key distractor fails.`
          ),
        },
        {
          id: 'interleaved-mix',
          label: '7 day interleaved domain mix',
          intervalHours: 168,
          action: 'Mix domain items with two adjacent ASPPB knowledge domains',
          completionEvidence: cleanSpaces(
            `Complete the 15 item mixed practice route for ${dom.label} alongside one Applied Clinical Case Workshop outline.`
          ),
        },
        {
          id: 'delayed-transfer',
          label: '14 day timed transfer check',
          intervalHours: 336,
          action: 'Complete a timed blueprint weighted practice form block',
          completionEvidence: cleanSpaces(
            `Sustain accurate pacing across ${dom.label} items inside a disjoint 60 item Practice Form (A, B, or C) with zero recurring trap slips.`
          ),
        },
      ],
      status: 'internal-spaced-review-plan',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    };
  });

  // 6. Verified Public Source Catalog (strictly backed by test_prep/reference_catalog.json)
  const refCatalog = referenceCatalog || {};
  const sourceCatalog = CURATED_EPPP_SOURCES.map((entry) => {
    const refMeta = refCatalog[entry.url];
    if (!refMeta) {
      throw new Error(`EPPP sourceCatalog URL missing from test_prep/reference_catalog.json: ${entry.url}`);
    }
    return {
      id: entry.id,
      title: cleanSpaces(refMeta.title || entry.fallbackTitle),
      organization: cleanSpaces(refMeta.organization || entry.fallbackOrg),
      url: entry.url,
      credibility: cleanSpaces(
        refMeta.credibility ||
          refMeta.whyReputable ||
          'Verified public professional, licensing, or federal health reference in the AlloFlow reference catalog.'
      ),
      sourceType: entry.sourceType,
      reviewedAt: '2026-11-23',
    };
  });

  return {
    workshopLabel: EPPP_WORKSHOPS.workshopLabel,
    workshopPracticeNote: EPPP_WORKSHOPS.workshopPracticeNote,
    quickReference: EPPP_QUICK_REF,
    misconceptionFamilies: families,
    misconceptionRemediationPlaybooks: playbooks,
    constructedResponseWorkshops: workshops,
    unitReviewRoutes,
    reviewLadders,
    practiceForms,
    studySessionPlans,
    spacedReviewPlans,
    sourceCatalog,
  };
}

module.exports = {
  ASPPB_DOMAINS,
  buildEpppStudyLayers,
};
