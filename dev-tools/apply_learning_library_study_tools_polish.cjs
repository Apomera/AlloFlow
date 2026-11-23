#!/usr/bin/env node
'use strict';

// Applies deduplicated chapter sections (school_librarian_5312: 22 sections),
// unit-specific AP memory aids (AP Calc AB: 8, AP Stats: 5, AP U.S. Gov: 5),
// tailored workshop prompts (teaching_reading_5205: 9 workshops), and
// enriched/deduplicated knowledge-check rationales (43 checks across 4 libraries).

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const testPrepDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const write = process.argv.includes('--write');

const slSections = require('./learning_library_study_tools_polish/sl5312_sections.cjs');
const { memoryAids, workshops } = require('./learning_library_study_tools_polish/ap_aids_and_tr5205_workshops.cjs');
const checkRationales = require('./learning_library_study_tools_polish/check_rationales_43.cjs');
const spedMemoryAids1 = require('./learning_library_study_tools_polish/sped_memory_aids_part1.cjs');
const spedMemoryAids2 = require('./learning_library_study_tools_polish/sped_memory_aids_part2.cjs');
const flashcardBacks38 = require('./learning_library_study_tools_polish/flashcard_backs_38.cjs');
const flashcardBacks60 = require('./learning_library_study_tools_polish/flashcard_backs_wave2_60.cjs');
const ec5025KeyTerms = require('./learning_library_study_tools_polish/ec5025_keyterms_48.cjs');
const tr5205KeyTerms = require('./learning_library_study_tools_polish/tr5205_keyterms_48.cjs');
const spedKeyTerms1 = require('./learning_library_study_tools_polish/sped_keyterms_part1_144.cjs');
const spedKeyTerms2 = require('./learning_library_study_tools_polish/sped_keyterms_part2_96.cjs');
const clinicalAudSlpDiagrams = require('./learning_library_diagrams/clinical_aud_slp_12.cjs');
const clinicalAudSlpDiagramsW2 = require('./learning_library_diagrams/clinical_aud_slp_wave2_12.cjs');
const clinicalPsychCounselorDiagrams = require('./learning_library_diagrams/clinical_psych_counselor_12.cjs');
const clinicalPsychCounselorDiagramsW2 = require('./learning_library_diagrams/clinical_psych_counselor_wave2_12.cjs');
const literacyDiagrams = require('./learning_library_diagrams/literacy_5205_5302_12.cjs');
const literacyDiagramsW2 = require('./learning_library_diagrams/literacy_5205_5302_wave2_12.cjs');
const esolEcDiagrams = require('./learning_library_diagrams/esol_ec_12.cjs');
const esolEcDiagramsW2 = require('./learning_library_diagrams/esol_ec_wave2_12.cjs');
const spedCoreEbdDiagrams = require('./learning_library_diagrams/sped_core_ebd_12.cjs');
const spedCoreEbdDiagramsW2 = require('./learning_library_diagrams/sped_core_ebd_wave2_12.cjs');
const spedEcIdDiagrams = require('./learning_library_diagrams/sped_ec_id_12.cjs');
const spedEcIdDiagramsW2 = require('./learning_library_diagrams/sped_ec_id_wave2_12.cjs');
const spedLdSpDiagrams = require('./learning_library_diagrams/sped_ld_sp_12.cjs');
const spedLdSpDiagramsW2 = require('./learning_library_diagrams/sped_ld_sp_wave2_12.cjs');
const coreParaproDiagrams = require('./learning_library_diagrams/core_parapro_12.cjs');
const coreParaproDiagramsW2 = require('./learning_library_diagrams/core_parapro_wave2_12.cjs');
const pltEcK6Diagrams = require('./learning_library_diagrams/plt_ec_k6_12.cjs');
const pltEcK6DiagramsW2 = require('./learning_library_diagrams/plt_ec_k6_wave2_12.cjs');
const plt59712Diagrams = require('./learning_library_diagrams/plt_59_712_12.cjs');
const plt59712DiagramsW2 = require('./learning_library_diagrams/plt_59_712_wave2_12.cjs');
const leadLibDiagrams = require('./learning_library_diagrams/lead_lib_12.cjs');
const leadLibDiagramsW2 = require('./learning_library_diagrams/lead_lib_wave2_12.cjs');
const apBioChemGlossary = require('./learning_library_glossaries/ap_bio_chem_glossary_51.cjs');
const apCalcPhysGlossary = require('./learning_library_glossaries/ap_calc_phys_glossary_48.cjs');
const apPsychStatsGovGlossary = require('./learning_library_glossaries/ap_psych_stats_gov_glossary_75.cjs');
const praxisAudSlpGlossary = require('./learning_library_glossaries/praxis_aud_slp_glossary_48.cjs');
const praxisSpsychScGlossary = require('./learning_library_glossaries/praxis_spsych_sc_glossary_48.cjs');
const praxisLiteracyGlossary = require('./learning_library_glossaries/praxis_literacy_glossary_48.cjs');
const praxisEsolEcGlossary = require('./learning_library_glossaries/praxis_esol_ec_glossary_48.cjs');
const praxisSpedCoreEbdGlossary = require('./learning_library_glossaries/praxis_sped_core_ebd_glossary_48.cjs');
const praxisSpedEcIdGlossary = require('./learning_library_glossaries/praxis_sped_ec_id_glossary_48.cjs');
const praxisSpedLdSpGlossary = require('./learning_library_glossaries/praxis_sped_ld_sp_glossary_48.cjs');
const praxisCoreParaproGlossary = require('./learning_library_glossaries/praxis_core_parapro_glossary_48.cjs');
const praxisPltEcK6Glossary = require('./learning_library_glossaries/praxis_plt_ec_k6_glossary_48.cjs');
const praxisPlt59712Glossary = require('./learning_library_glossaries/praxis_plt_59_712_glossary_48.cjs');
const praxisLeadLibGlossary = require('./learning_library_glossaries/praxis_lead_lib_glossary_48.cjs');
const apBioChemExamples = require('./learning_library_worked_examples/ap_bio_chem_examples_51.cjs');
const apPhysStatsExamples = require('./learning_library_worked_examples/ap_phys_stats_examples_39.cjs');
const apPsychGovUshExamples = require('./learning_library_worked_examples/ap_psych_gov_ush_examples_57.cjs');
const clinicalAudSlpCases = require('./learning_library_cases/clinical_aud_slp_cases_24.cjs');
const clinicalSpsychScCases = require('./learning_library_cases/clinical_spsych_sc_cases_24.cjs');
const literacyCases = require('./learning_library_cases/literacy_5205_5302_cases_24.cjs');
const esolEcCases = require('./learning_library_cases/esol_ec_cases_24.cjs');
const spedCoreEbdCases = require('./learning_library_cases/sped_core_ebd_cases_24.cjs');
const spedEcIdCases = require('./learning_library_cases/sped_ec_id_cases_24.cjs');
const spedLdSpCases = require('./learning_library_cases/sped_ld_sp_cases_24.cjs');
const coreParaproCases = require('./learning_library_cases/core_parapro_cases_24.cjs');
const pltEcK6Cases = require('./learning_library_cases/plt_ec_k6_cases_24.cjs');
const plt59712Cases = require('./learning_library_cases/plt_59_712_cases_24.cjs');
const leadLibCases = require('./learning_library_cases/lead_lib_cases_24.cjs');
const apCalcClinicalTakeaways = require('./learning_library_takeaways/ap_calc_clinical_takeaways_56.cjs');
const literacyEsolEcTakeaways = require('./learning_library_takeaways/literacy_esol_ec_takeaways_48.cjs');
const spedPart1Takeaways = require('./learning_library_takeaways/sped_part1_takeaways_36.cjs');
const spedPart2Takeaways = require('./learning_library_takeaways/sped_part2_takeaways_36.cjs');
const coreParaproPltEcK6Takeaways = require('./learning_library_takeaways/core_parapro_plt_ec_k6_takeaways_48.cjs');
const plt59712LeadLibTakeaways = require('./learning_library_takeaways/plt_59_712_lead_lib_takeaways_48.cjs');
const clinicalAudSlpWorkshops = require('./learning_library_workshops/clinical_aud_slp_workshops_12.cjs');
const clinicalSpsychScWorkshops = require('./learning_library_workshops/clinical_spsych_sc_workshops_12.cjs');
const leadLibWorkshops = require('./learning_library_workshops/lead_lib_workshops_12.cjs');
const ecParaproWorkshops = require('./learning_library_workshops/ec_parapro_workshops_12.cjs');
const spedCoreEbdWorkshops = require('./learning_library_workshops/sped_core_ebd_workshops_12.cjs');
const spedEcIdWorkshops = require('./learning_library_workshops/sped_ec_id_workshops_12.cjs');
const spedLdSpWorkshops = require('./learning_library_workshops/sped_ld_sp_workshops_12.cjs');
const ap6QuickRef = require('./learning_library_quick_ref/ap_6_quick_ref.cjs');
const clinical4QuickRef = require('./learning_library_quick_ref/clinical_4_quick_ref.cjs');
const literacyEsolEc4QuickRef = require('./learning_library_quick_ref/literacy_esol_ec_4_quick_ref.cjs');
const sped6QuickRef = require('./learning_library_quick_ref/sped_6_quick_ref.cjs');
const coreParaproPlt4QuickRef = require('./learning_library_quick_ref/core_parapro_plt_4_quick_ref.cjs');
const plt59712LeadLib4QuickRef = require('./learning_library_quick_ref/plt_59_712_lead_lib_4_quick_ref.cjs');
const ap6Playbooks = require('./learning_library_playbooks/ap_6_playbooks_36.cjs');
const clinical4Playbooks = require('./learning_library_playbooks/clinical_4_playbooks_24.cjs');
const literacyEsolEc4Playbooks = require('./learning_library_playbooks/literacy_esol_ec_4_playbooks_24.cjs');
const sped6Playbooks = require('./learning_library_playbooks/sped_6_playbooks_36.cjs');
const coreParaproPlt4Playbooks = require('./learning_library_playbooks/core_parapro_plt_4_playbooks_24.cjs');
const plt59712LeadLib4Playbooks = require('./learning_library_playbooks/plt_59_712_lead_lib_4_playbooks_24.cjs');
const libraryQuickReferences = {
  ...ap6QuickRef,
  ...clinical4QuickRef,
  ...literacyEsolEc4QuickRef,
  ...sped6QuickRef,
  ...coreParaproPlt4QuickRef,
  ...plt59712LeadLib4QuickRef,
};
const libraryMisconceptionPlaybooks = {
  ...ap6Playbooks,
  ...clinical4Playbooks,
  ...literacyEsolEc4Playbooks,
  ...sped6Playbooks,
  ...coreParaproPlt4Playbooks,
  ...plt59712LeadLib4Playbooks,
};
const libraryChapterTakeaways = {
  ...apCalcClinicalTakeaways,
  ...literacyEsolEcTakeaways,
  ...spedPart1Takeaways,
  ...spedPart2Takeaways,
  ...coreParaproPltEcK6Takeaways,
  ...plt59712LeadLibTakeaways,
};
const libraryAppliedWorkshops = {
  ...clinicalAudSlpWorkshops,
  ...clinicalSpsychScWorkshops,
  ...leadLibWorkshops,
  ...ecParaproWorkshops,
  ...spedCoreEbdWorkshops,
  ...spedEcIdWorkshops,
  ...spedLdSpWorkshops,
};
const sectionWorkedExamples = {
  ...apBioChemExamples,
  ...apPhysStatsExamples,
  ...apPsychGovUshExamples,
};
const sectionExpandableCases = {
  ...clinicalAudSlpCases,
  ...clinicalSpsychScCases,
  ...literacyCases,
  ...esolEcCases,
  ...spedCoreEbdCases,
  ...spedEcIdCases,
  ...spedLdSpCases,
  ...coreParaproCases,
  ...pltEcK6Cases,
  ...plt59712Cases,
  ...leadLibCases,
};
const sectionKeyTerms = { ...ec5025KeyTerms, ...tr5205KeyTerms, ...spedKeyTerms1, ...spedKeyTerms2 };
const libraryGlossaries = {
  ...apBioChemGlossary,
  ...apCalcPhysGlossary,
  ...apPsychStatsGovGlossary,
  ...praxisAudSlpGlossary,
  ...praxisSpsychScGlossary,
  ...praxisLiteracyGlossary,
  ...praxisEsolEcGlossary,
  ...praxisSpedCoreEbdGlossary,
  ...praxisSpedEcIdGlossary,
  ...praxisSpedLdSpGlossary,
  ...praxisCoreParaproGlossary,
  ...praxisPltEcK6Glossary,
  ...praxisPlt59712Glossary,
  ...praxisLeadLibGlossary,
};
const libraryDiagrams = {};
for (const src of [
  clinicalAudSlpDiagrams, clinicalAudSlpDiagramsW2,
  clinicalPsychCounselorDiagrams, clinicalPsychCounselorDiagramsW2,
  literacyDiagrams, literacyDiagramsW2,
  esolEcDiagrams, esolEcDiagramsW2,
  spedCoreEbdDiagrams, spedCoreEbdDiagramsW2,
  spedEcIdDiagrams, spedEcIdDiagramsW2,
  spedLdSpDiagrams, spedLdSpDiagramsW2,
  coreParaproDiagrams, coreParaproDiagramsW2,
  pltEcK6Diagrams, pltEcK6DiagramsW2,
  plt59712Diagrams, plt59712DiagramsW2,
  leadLibDiagrams, leadLibDiagramsW2,
]) {
  for (const [stem, pack] of Object.entries(src || {})) {
    const existing = libraryDiagrams[stem] || { diagrams: [], diagramPlacements: [] };
    libraryDiagrams[stem] = {
      diagrams: existing.diagrams.concat(Array.isArray(pack?.diagrams) ? pack.diagrams : []),
      diagramPlacements: existing.diagramPlacements.concat(Array.isArray(pack?.diagramPlacements) ? pack.diagramPlacements : []),
    };
  }
}
const flashcardBacks = {};
for (const src of [flashcardBacks38 || {}, flashcardBacks60 || {}]) {
  for (const [stem, cardMap] of Object.entries(src)) {
    flashcardBacks[stem] = { ...(flashcardBacks[stem] || {}), ...cardMap };
  }
}
const praxisWorkshopCriteria = require('./learning_library_study_tools_polish/praxis_workshops_criteria_25.cjs');
const praxisWorkshopSubfields = require('./learning_library_study_tools_polish/praxis_workshops_subfields_25.cjs');
const allMemoryAids = { ...memoryAids, ...spedMemoryAids1, ...spedMemoryAids2 };
const allWorkshops = {};
for (const src of [workshops || {}, praxisWorkshopCriteria || {}, praxisWorkshopSubfields || {}]) {
  for (const [stem, wsMap] of Object.entries(src)) {
    allWorkshops[stem] = allWorkshops[stem] || {};
    for (const [id, patch] of Object.entries(wsMap)) {
      allWorkshops[stem][id] = { ...(allWorkshops[stem][id] || {}), ...patch };
    }
  }
}

const canon = (v) => String(Array.isArray(v) ? v.join(' ') : (v || '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function saveLib(fileName, lib) {
  if (!write) return;
  const json = JSON.stringify(lib, null, 2) + '\n';
  for (const dir of [testPrepDir, deployDir]) {
    writeGeneratedFile(path.join(dir, fileName), json, 'utf8');
  }
}

// 1. School Librarian 5312 duplicate sections (22 of 48)
{
  const fileName = 'school_librarian_5312_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seen = new Set();
  let changed = 0;
  for (const ch of lib.chapters || []) {
    ch.sections = (ch.sections || []).map((sec) => {
      const ov = slSections[sec.id];
      if (!ov) return sec;
      seen.add(sec.id);
      const next = { ...sec, ...ov };
      if (JSON.stringify(next) !== JSON.stringify(sec)) changed += 1;
      return next;
    });
  }
  const unknown = Object.keys(slSections).filter((id) => !seen.has(id));
  if (unknown.length) throw new Error('school_librarian_5312 unknown section id(s): ' + unknown.join(', '));
  const bodies = new Set();
  for (const ch of lib.chapters || []) {
    for (const s of ch.sections || []) {
      const c = canon(s.content || '');
      if (bodies.has(c)) throw new Error('school_librarian_5312 duplicate section body remains: ' + s.id);
      bodies.add(c);
    }
  }
  console.log(`school_librarian_5312 sections: ${seen.size} patched, ${changed} changed, ${bodies.size}/48 unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 2. AP Calculus AB, AP Statistics, AP U.S. Government, and 5 SPED library memory aids (118 total)
for (const [stem, aidMap] of Object.entries(allMemoryAids || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seen = new Set();
  let changed = 0;
  const patchList = (list) => (list || []).map((aid) => {
    const ov = aidMap[aid.id];
    if (!ov) return aid;
    seen.add(aid.id);
    const next = { ...aid, ...ov };
    if (JSON.stringify(next) !== JSON.stringify(aid)) changed += 1;
    return next;
  });
  if (Array.isArray(lib.memoryAids)) lib.memoryAids = patchList(lib.memoryAids);
  for (const ch of lib.chapters || []) {
    if (Array.isArray(ch.memoryAids)) ch.memoryAids = patchList(ch.memoryAids);
  }
  const unknown = Object.keys(aidMap).filter((id) => !seen.has(id));
  if (unknown.length) throw new Error(`${stem} unknown memoryAid id(s): ${unknown.join(', ')}`);

  const allAids = [
    ...(Array.isArray(lib.memoryAids) ? lib.memoryAids : []),
    ...(lib.chapters || []).flatMap((ch) => ch.memoryAids || []),
  ];
  const bodySet = new Set();
  for (const a of allAids) {
    const c = canon(a.content || a.text || a.explanation || a.summary || a.steps || a.cues || a.points || '');
    if (bodySet.has(c)) throw new Error(`${stem} duplicate memoryAid body remains: ${a.id}`);
    bodySet.add(c);
  }
  console.log(`${stem} memoryAids: ${seen.size} patched, ${changed} changed, ${bodySet.size}/${allAids.length} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 3. Constructed-response workshops (teaching_reading_5205 prompts + esol_5362, praxis_core_5752, teaching_reading_5205 criteria)
for (const [stem, wsMap] of Object.entries(allWorkshops)) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seen = new Set();
  let changed = 0;
  lib.constructedResponseWorkshops = (lib.constructedResponseWorkshops || []).map((ws) => {
    const ov = wsMap[ws.id];
    if (!ov) return ws;
    seen.add(ws.id);
    const next = { ...ws, ...ov };
    if (JSON.stringify(next) !== JSON.stringify(ws)) changed += 1;
    return next;
  });
  const unknown = Object.keys(wsMap).filter((id) => !seen.has(id));
  if (unknown.length) throw new Error(`${stem} unknown workshop id(s): ${unknown.join(', ')}`);
  const promptSet = new Set(lib.constructedResponseWorkshops.map((w) => canon(w.prompt || '')));
  if (promptSet.size !== lib.constructedResponseWorkshops.length) {
    throw new Error(`${stem} duplicate workshop prompt remains`);
  }
  const pfSet = new Set(lib.constructedResponseWorkshops.map((w) => JSON.stringify(w.planningFrame || [])));
  const scSet = new Set(lib.constructedResponseWorkshops.map((w) => JSON.stringify(w.successCriteria || [])));
  const cpSet = new Set(lib.constructedResponseWorkshops.map((w) => JSON.stringify(w.commonPitfalls || [])));
  const tpSet = new Set(lib.constructedResponseWorkshops.map((w) => JSON.stringify(w.taskParts || [])));
  const soSet = new Set(lib.constructedResponseWorkshops.map((w) => JSON.stringify(w.sampleOutline || [])));
  if (pfSet.size !== lib.constructedResponseWorkshops.length) {
    throw new Error(`${stem} duplicate workshop planningFrame remains`);
  }
  if (scSet.size !== lib.constructedResponseWorkshops.length) {
    throw new Error(`${stem} duplicate workshop successCriteria remains`);
  }
  if (cpSet.size !== lib.constructedResponseWorkshops.length) {
    throw new Error(`${stem} duplicate workshop commonPitfalls remains`);
  }
  if (tpSet.size !== lib.constructedResponseWorkshops.length) {
    throw new Error(`${stem} duplicate workshop taskParts remains`);
  }
  if (soSet.size !== lib.constructedResponseWorkshops.length) {
    throw new Error(`${stem} duplicate workshop sampleOutline remains`);
  }
  console.log(`${stem} workshops: ${seen.size} patched, ${changed} changed, ${promptSet.size}/${lib.constructedResponseWorkshops.length} unique across all workshop fields`);
  if (changed > 0) saveLib(fileName, lib);
}

// 4. Enriched and deduplicated knowledge-check rationales (43 total across 4 libraries)
for (const [stem, ckMap] of Object.entries(checkRationales || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seen = new Set();
  let changed = 0;
  for (const ch of lib.chapters || []) {
    ch.knowledgeChecks = (ch.knowledgeChecks || []).map((ck) => {
      const ov = ckMap[ck.id];
      if (!ov) return ck;
      seen.add(ck.id);
      const next = { ...ck, rationale: String(ov.rationale || '').trim() };
      if (JSON.stringify(next) !== JSON.stringify(ck)) changed += 1;
      return next;
    });
  }
  const unknown = Object.keys(ckMap).filter((id) => !seen.has(id));
  if (unknown.length) throw new Error(`${stem} unknown check id(s): ${unknown.join(', ')}`);
  const ratSet = new Set();
  let totalChecks = 0;
  for (const ch of lib.chapters || []) {
    for (const ck of ch.knowledgeChecks || []) {
      if (!Array.isArray(ck.choices) || ck.choices.length !== 4) continue;
      totalChecks += 1;
      const text = String(ck.rationale || ck.explanation || '').trim();
      if (text.length < 80) throw new Error(`${stem}/${ck.id}: short check rationale (${text.length} chars)`);
      const c = canon(text);
      if (ratSet.has(c)) throw new Error(`${stem}/${ck.id}: duplicate check rationale remains`);
      ratSet.add(c);
    }
  }
  console.log(`${stem} checkRationales: ${seen.size} patched, ${changed} changed, ${ratSet.size}/${totalChecks} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 5. Enriched and deduplicated flashcard backs (38 total across 4 libraries)
for (const [stem, cardMap] of Object.entries(flashcardBacks || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seen = new Set();
  let changed = 0;
  const patchCards = (list) => (list || []).map((card) => {
    const ov = cardMap[card.id];
    if (!ov) return card;
    seen.add(card.id);
    const next = { ...card, back: String(ov.back || '').trim() };
    if (JSON.stringify(next) !== JSON.stringify(card)) changed += 1;
    return next;
  });
  if (Array.isArray(lib.flashcards)) lib.flashcards = patchCards(lib.flashcards);
  for (const ch of lib.chapters || []) {
    if (Array.isArray(ch.flashcards)) ch.flashcards = patchCards(ch.flashcards);
  }
  const unknown = Object.keys(cardMap).filter((id) => !seen.has(id));
  if (unknown.length) throw new Error(`${stem} unknown flashcard id(s): ${unknown.join(', ')}`);
  const allCards = [
    ...(Array.isArray(lib.flashcards) ? lib.flashcards : []),
    ...(lib.chapters || []).flatMap((ch) => ch.flashcards || []),
  ];
  const backSet = new Set();
  for (const card of allCards) {
    const back = String(card.back || card.definition || card.answer || '').trim();
    if (/Use the relevant evidence, convention/i.test(back)) {
      throw new Error(`${stem}/${card.id}: boilerplate flashcard tail remains`);
    }
    const c = canon(back);
    if (backSet.has(c)) throw new Error(`${stem}/${card.id}: duplicate flashcard back remains`);
    backSet.add(c);
  }
  console.log(`${stem} flashcardBacks: ${seen.size} patched, ${changed} changed, ${backSet.size}/${allCards.length} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 6. Tailored section-level keyTerms across 7 Praxis learning libraries (336 sections total)
for (const [stem, ktMap] of Object.entries(sectionKeyTerms || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seen = new Set();
  let changed = 0;
  for (const ch of lib.chapters || []) {
    ch.sections = (ch.sections || []).map((sec) => {
      const ov = ktMap[sec.id];
      if (!ov) return sec;
      seen.add(sec.id);
      const next = { ...sec, keyTerms: ov.slice() };
      if (JSON.stringify(next) !== JSON.stringify(sec)) changed += 1;
      return next;
    });
  }
  const unknown = Object.keys(ktMap).filter((id) => !seen.has(id));
  if (unknown.length) throw new Error(`${stem} unknown section keyTerms id(s): ${unknown.join(', ')}`);
  const allSecs = (lib.chapters || []).flatMap((ch) => ch.sections || []);
  const ktSet = new Set(allSecs.map((s) => JSON.stringify(s.keyTerms || [])));
  if (ktSet.size !== allSecs.length) {
    throw new Error(`${stem} duplicate section keyTerms remains (${ktSet.size}/${allSecs.length})`);
  }
  console.log(`${stem} sectionKeyTerms: ${seen.size} patched, ${changed} changed, ${ktSet.size}/${allSecs.length} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 7. Accessible alloflow-diagram-v1 textbook diagrams and chapter/section placements
const safeDiagramId = /^[A-Za-z][A-Za-z0-9_.:-]*$/;
for (const [stem, packDiag] of Object.entries(libraryDiagrams || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const diagrams = Array.isArray(packDiag.diagrams) ? packDiag.diagrams : [];
  const placements = Array.isArray(packDiag.diagramPlacements) ? packDiag.diagramPlacements : [];
  const diagById = new Map();
  for (const d of diagrams) {
    if (!safeDiagramId.test(String(d.id || '')) || diagById.has(d.id)) {
      throw new Error(`${stem} invalid/duplicate diagram id: ${d.id}`);
    }
    const spec = d.spec || {};
    const acc = d.accessibility || {};
    const nodeIds = new Set((spec.nodes || []).map((n) => n.id));
    if (spec.format !== 'alloflow-diagram-v1' || nodeIds.size < 2 || !Array.isArray(spec.edges)) {
      throw new Error(`${stem}/${d.id}: invalid alloflow-diagram-v1 spec`);
    }
    if (!Array.isArray(acc.readingOrder) || acc.readingOrder.length !== nodeIds.size || acc.readingOrder.some((id) => !nodeIds.has(id))) {
      throw new Error(`${stem}/${d.id}: invalid accessibility.readingOrder`);
    }
    if (!acc.shortAlt || !acc.longDescription || !Array.isArray(acc.textEquivalent) || !acc.textEquivalent.length) {
      throw new Error(`${stem}/${d.id}: missing accessibility text alternative`);
    }
    diagById.set(d.id, d);
  }
  const chById = new Map((lib.chapters || []).map((c) => [c.id, c]));
  const chOrder = new Map((lib.chapters || []).map((c, idx) => [c.id, idx]));
  for (const pl of placements) {
    const ch = chById.get(pl.chapterId);
    const sec = ch && (ch.sections || []).find((s) => s.id === pl.sectionId);
    if (!ch || !sec || !diagById.has(pl.diagramId)) {
      throw new Error(`${stem}/${pl.id}: unresolved diagram placement (${pl.chapterId}/${pl.sectionId}/${pl.diagramId})`);
    }
  }
  const sortedDiagrams = diagrams.slice().sort((a, b) => (chOrder.get(a.chapterId) ?? 999) - (chOrder.get(b.chapterId) ?? 999));
  const sortedPlacements = placements.slice().sort((a, b) => (chOrder.get(a.chapterId) ?? 999) - (chOrder.get(b.chapterId) ?? 999));
  const before = JSON.stringify({
    diagrams: lib.diagrams,
    diagramPlacements: lib.diagramPlacements,
    summaryDiagrams: lib.summary?.diagrams,
    summaryPlacements: lib.summary?.diagramPlacements,
  });
  lib.diagrams = sortedDiagrams;
  lib.diagramPlacements = sortedPlacements;
  if (lib.summary && typeof lib.summary === 'object') {
    lib.summary.diagrams = diagrams.length;
    lib.summary.diagramPlacements = placements.length;
  }
  const after = JSON.stringify({
    diagrams: lib.diagrams,
    diagramPlacements: lib.diagramPlacements,
    summaryDiagrams: lib.summary?.diagrams,
    summaryPlacements: lib.summary?.diagramPlacements,
  });
  const changed = before !== after ? diagrams.length : 0;
  console.log(`${stem} diagrams: ${diagrams.length} validated, ${changed} changed, ${placements.length} placements`);
  if (changed > 0) saveLib(fileName, lib);
}

// 8. Curated, chapter-linked searchable study glossaries
for (const [stem, rawTerms] of Object.entries(libraryGlossaries || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const chById = new Map((lib.chapters || []).map((c) => [c.id, c]));
  const idSet = new Set();
  const termSet = new Set();
  const defSet = new Set();
  const terms = (Array.isArray(rawTerms) ? rawTerms : []).map((entry) => {
    const id = String(entry.id || '').trim();
    const term = String(entry.term || '').trim();
    const definition = String(entry.definition || '').trim();
    if (!id || idSet.has(id)) throw new Error(`${stem} invalid/duplicate glossary id: ${id}`);
    const normTerm = canon(term);
    if (!term || termSet.has(normTerm)) throw new Error(`${stem} invalid/duplicate glossary term: ${term}`);
    const normDef = canon(definition);
    if (definition.length < 80 || defSet.has(normDef)) throw new Error(`${stem}/${id} short/duplicate glossary definition`);
    idSet.add(id);
    termSet.add(normTerm);
    defSet.add(normDef);
    const occurrences = (entry.linkage?.occurrences || []).map((occ) => {
      const ch = chById.get(occ.chapterId);
      const sec = ch && (ch.sections || []).find((s) => s.id === occ.sectionId);
      if (!ch || !sec) throw new Error(`${stem}/${id} unresolved glossary occurrence ${occ.chapterId}/${occ.sectionId}`);
      return { ...occ, occurrences: occ.occurrences === undefined ? 1 : occ.occurrences };
    });
    return {
      ...entry,
      linkage: { ...(entry.linkage || {}), occurrences },
    };
  });
  const before = JSON.stringify({ glossary: lib.glossary, count: lib.summary?.glossaryTerms });
  lib.glossary = terms;
  if (lib.summary && typeof lib.summary === 'object') {
    lib.summary.glossaryTerms = terms.length;
  }
  const after = JSON.stringify({ glossary: lib.glossary, count: lib.summary?.glossaryTerms });
  const changed = before !== after ? terms.length : 0;
  console.log(`${stem} glossary: ${terms.length} validated, ${changed} changed, ${termSet.size}/${terms.length} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 9. Section-level worked examples and misconception-repair callouts
for (const [stem, secMap] of Object.entries(sectionWorkedExamples || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seenPrompts = new Set();
  let matched = 0;
  let changed = 0;
  for (const ch of lib.chapters || []) {
    for (const sec of ch.sections || []) {
      const patch = secMap[sec.id];
      if (!patch) continue;
      const we = patch.workedExample || {};
      const mg = Array.isArray(patch.misconceptionGuidance) ? patch.misconceptionGuidance : [];
      const prompt = String(we.prompt || '').trim();
      if (!prompt || !Array.isArray(we.steps) || we.steps.length < 2) {
        throw new Error(`${stem}/${sec.id}: invalid workedExample`);
      }
      const normPrompt = canon(prompt);
      if (seenPrompts.has(normPrompt)) throw new Error(`${stem}/${sec.id}: duplicate workedExample prompt`);
      seenPrompts.add(normPrompt);
      if (mg.length < 2 || mg.some((e) => !e || !String(e.misconception || '').trim() || !String(e.repair || '').trim())) {
        throw new Error(`${stem}/${sec.id}: invalid misconceptionGuidance`);
      }
      matched += 1;
      const before = JSON.stringify({ workedExample: sec.workedExample, misconceptionGuidance: sec.misconceptionGuidance });
      sec.workedExample = { prompt, steps: we.steps.slice(), original: true };
      sec.misconceptionGuidance = mg.map((e) => ({ misconception: e.misconception, repair: e.repair }));
      const after = JSON.stringify({ workedExample: sec.workedExample, misconceptionGuidance: sec.misconceptionGuidance });
      if (before !== after) changed += 1;
    }
  }
  const expected = Object.keys(secMap).length;
  if (matched !== expected) {
    throw new Error(`${stem} workedExamples: matched ${matched}/${expected} section IDs`);
  }
  console.log(`${stem} workedExamples: ${matched} validated, ${changed} changed, ${seenPrompts.size}/${matched} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 10. Section-level applied case vignettes (expandableCase)
for (const [stem, caseMap] of Object.entries(sectionExpandableCases || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seenTitles = new Set();
  const coveredChapters = new Set();
  let matched = 0;
  let changed = 0;
  for (const ch of lib.chapters || []) {
    for (const sec of ch.sections || []) {
      const c = caseMap[sec.id];
      if (!c) continue;
      const title = String(c.title || '').trim();
      const clinicalDescription = String(c.clinicalDescription || '').trim();
      const diagnosis = String(c.diagnosis || '').trim();
      const explanation = String(c.explanation || '').trim();
      if (!title || clinicalDescription.length < 180 || diagnosis.length < 40 || explanation.length < 180) {
        throw new Error(`${stem}/${sec.id}: invalid expandableCase`);
      }
      const normTitle = canon(title);
      if (seenTitles.has(normTitle)) throw new Error(`${stem}/${sec.id}: duplicate expandableCase title`);
      seenTitles.add(normTitle);
      coveredChapters.add(ch.id);
      matched += 1;
      const nextCase = {
        schemaVersion: 1,
        label: String(c.label || 'Applied case'),
        presentationLabel: String(c.presentationLabel || 'Scenario'),
        answerLabel: String(c.answerLabel || 'Best decision'),
        explanationLabel: String(c.explanationLabel || 'Rationale'),
        title,
        clinicalDescription,
        diagnosis,
        explanation,
      };
      const before = JSON.stringify(sec.expandableCase || null);
      sec.expandableCase = nextCase;
      const after = JSON.stringify(sec.expandableCase);
      if (before !== after) changed += 1;
    }
  }
  const expected = Object.keys(caseMap).length;
  if (matched !== expected || coveredChapters.size !== (lib.chapters || []).length) {
    throw new Error(`${stem} expandableCases: matched ${matched}/${expected}, chapters ${coveredChapters.size}/${(lib.chapters || []).length}`);
  }
  if (lib.summary && typeof lib.summary === 'object') {
    lib.summary.appliedCases = matched;
  }
  console.log(`${stem} expandableCases: ${matched} validated, ${changed} changed, ${coveredChapters.size}/${(lib.chapters || []).length} chapters`);
  if (changed > 0) saveLib(fileName, lib);
}

// 11. Chapter-level high-yield exam takeaways (chapterTakeaways)
for (const [stem, chMap] of Object.entries(libraryChapterTakeaways || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const seenTakeaways = new Set();
  let matched = 0;
  let changed = 0;
  for (const ch of lib.chapters || []) {
    const rawList = chMap[ch.id];
    if (!rawList) continue;
    const list = (Array.isArray(rawList) ? rawList : []).map((s) => String(s || '').trim()).filter(Boolean);
    if (list.length < 3) throw new Error(`${stem}/${ch.id}: needs at least 3 chapterTakeaways`);
    for (const item of list) {
      const norm = canon(item);
      if (item.length < 70 || seenTakeaways.has(norm)) {
        throw new Error(`${stem}/${ch.id}: short/duplicate chapterTakeaway`);
      }
      seenTakeaways.add(norm);
    }
    matched += 1;
    const before = JSON.stringify(ch.chapterTakeaways || null);
    ch.chapterTakeaways = list;
    const after = JSON.stringify(ch.chapterTakeaways);
    if (before !== after) changed += 1;
  }
  const expected = Object.keys(chMap).length;
  if (matched !== expected || matched !== (lib.chapters || []).length) {
    throw new Error(`${stem} chapterTakeaways: matched ${matched}/${expected} (library has ${(lib.chapters || []).length} chapters)`);
  }
  console.log(`${stem} chapterTakeaways: ${matched} chapters validated, ${changed} changed, ${seenTakeaways.size} unique takeaways`);
  if (changed > 0) saveLib(fileName, lib);
}

// 12. Interactive applied case workshops across the 14 remaining Praxis/ParaPro libraries
for (const [stem, packWs] of Object.entries(libraryAppliedWorkshops || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const wsList = Array.isArray(packWs?.workshops) ? packWs.workshops : [];
  if (wsList.length < 6) throw new Error(`${stem} appliedWorkshops: expected at least 6 workshops`);
  const seenIds = new Set();
  const seenTitles = new Set();
  const seenPrompts = new Set();
  for (const w of wsList) {
    const id = String(w.id || '').trim();
    const title = String(w.title || '').trim();
    const prompt = String(w.prompt || '').trim();
    const stimulus = String(w.stimulus || '').trim();
    if (!id || seenIds.has(id)) throw new Error(`${stem} invalid/duplicate workshop id: ${id}`);
    if (!title || seenTitles.has(canon(title))) throw new Error(`${stem}/${id} invalid/duplicate workshop title`);
    if (!prompt || seenPrompts.has(canon(prompt))) throw new Error(`${stem}/${id} invalid/duplicate workshop prompt`);
    if (stimulus.length < 200) throw new Error(`${stem}/${id} short workshop stimulus`);
    if (!Array.isArray(w.taskParts) || w.taskParts.length < 3 || !Array.isArray(w.planningFrame) || w.planningFrame.length < 4 || !Array.isArray(w.successCriteria) || w.successCriteria.length < 4 || !Array.isArray(w.commonPitfalls) || w.commonPitfalls.length < 4 || !Array.isArray(w.sampleOutline) || w.sampleOutline.length < 3) {
      throw new Error(`${stem}/${id} incomplete workshop structure`);
    }
    seenIds.add(id);
    seenTitles.add(canon(title));
    seenPrompts.add(canon(prompt));
  }
  const before = JSON.stringify({
    workshopLabel: lib.workshopLabel,
    workshopPracticeNote: lib.workshopPracticeNote,
    workshops: lib.constructedResponseWorkshops,
    summaryCount: lib.summary?.constructedResponseWorkshops,
  });
  lib.workshopLabel = String(packWs.workshopLabel || 'Applied case workshops');
  lib.workshopPracticeNote = String(packWs.workshopPracticeNote || '');
  lib.constructedResponseWorkshops = wsList;
  if (lib.summary && typeof lib.summary === 'object') {
    lib.summary.constructedResponseWorkshops = wsList.length;
  }
  const after = JSON.stringify({
    workshopLabel: lib.workshopLabel,
    workshopPracticeNote: lib.workshopPracticeNote,
    workshops: lib.constructedResponseWorkshops,
    summaryCount: lib.summary?.constructedResponseWorkshops,
  });
  const changed = before !== after ? wsList.length : 0;
  console.log(`${stem} appliedWorkshops: ${wsList.length} validated, ${changed} changed, ${seenIds.size}/${wsList.length} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 13. High-yield exam-day Quick Reference cards (quickReference) across all 28 remaining non-EPPP libraries
for (const [stem, cards] of Object.entries(libraryQuickReferences || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const list = Array.isArray(cards) ? cards : [];
  if (list.length < 3) throw new Error(`${stem} quickReference: expected at least 3 cards`);
  const seenIds = new Set();
  const seenTitles = new Set();
  for (const card of list) {
    const id = String(card.id || '').trim();
    const title = String(card.title || '').trim();
    const purpose = String(card.purpose || '').trim();
    if (!id || seenIds.has(id)) throw new Error(`${stem} invalid/duplicate quickReference id: ${id}`);
    if (!title || seenTitles.has(canon(title))) throw new Error(`${stem}/${id} invalid/duplicate quickReference title`);
    if (!purpose) throw new Error(`${stem}/${id} missing quickReference purpose`);
    if (!Array.isArray(card.checklist) || card.checklist.length < 3 || !Array.isArray(card.formulas) || card.formulas.length < 4 || !Array.isArray(card.decisionRules) || card.decisionRules.length < 4 || !Array.isArray(card.cautions) || card.cautions.length < 3) {
      throw new Error(`${stem}/${id} incomplete quickReference lists`);
    }
    seenIds.add(id);
    seenTitles.add(canon(title));
  }
  const before = JSON.stringify({ qr: lib.quickReference, count: lib.summary?.quickReferenceCards });
  lib.quickReference = list;
  if (lib.summary && typeof lib.summary === 'object') {
    lib.summary.quickReferenceCards = list.length;
  }
  const after = JSON.stringify({ qr: lib.quickReference, count: lib.summary?.quickReferenceCards });
  const changed = before !== after ? list.length : 0;
  console.log(`${stem} quickReference: ${list.length} validated, ${changed} changed, ${seenIds.size}/${list.length} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

// 14. Interactive Misconception Playbooks (misconceptionFamilies + misconceptionRemediationPlaybooks)
for (const [stem, packPb] of Object.entries(libraryMisconceptionPlaybooks || {})) {
  const fileName = stem + '_learning_library.json';
  const lib = JSON.parse(fs.readFileSync(path.join(testPrepDir, fileName), 'utf8'));
  const families = Array.isArray(packPb?.misconceptionFamilies) ? packPb.misconceptionFamilies : [];
  const playbooks = Array.isArray(packPb?.misconceptionRemediationPlaybooks) ? packPb.misconceptionRemediationPlaybooks : [];
  if (families.length < 6 || playbooks.length !== families.length) {
    throw new Error(`${stem} playbooks: expected >= 6 paired families and playbooks`);
  }
  const famById = new Map();
  for (const f of families) {
    if (!f.id || famById.has(f.id) || !Array.isArray(f.itemIds) || f.itemIds.length < 10) {
      throw new Error(`${stem}/${f.id}: invalid misconceptionFamily`);
    }
    famById.set(f.id, f);
  }
  const seenPb = new Set();
  for (const pb of playbooks) {
    const fam = famById.get(pb.familyId);
    if (!pb.id || seenPb.has(pb.id) || !fam || fam.remediationPlaybookId !== pb.id) {
      throw new Error(`${stem}/${pb.id}: broken family/playbook link`);
    }
    if (!pb.title || !pb.recognitionCue || !pb.repairQuestion || !Array.isArray(pb.stages) || pb.stages.length < 4) {
      throw new Error(`${stem}/${pb.id}: incomplete playbook fields`);
    }
    seenPb.add(pb.id);
  }
  const before = JSON.stringify({
    f: lib.misconceptionFamilies,
    p: lib.misconceptionRemediationPlaybooks,
    c: lib.summary?.misconceptionPlaybooks,
  });
  lib.misconceptionFamilies = families;
  lib.misconceptionRemediationPlaybooks = playbooks;
  if (lib.summary && typeof lib.summary === 'object') {
    lib.summary.misconceptionPlaybooks = playbooks.length;
  }
  const after = JSON.stringify({
    f: lib.misconceptionFamilies,
    p: lib.misconceptionRemediationPlaybooks,
    c: lib.summary?.misconceptionPlaybooks,
  });
  const changed = before !== after ? playbooks.length : 0;
  console.log(`${stem} playbooks: ${playbooks.length} validated, ${changed} changed, ${seenPb.size}/${playbooks.length} unique`);
  if (changed > 0) saveLib(fileName, lib);
}

if (!write) console.log('Check passed; nothing written.');
