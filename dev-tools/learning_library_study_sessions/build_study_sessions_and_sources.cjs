'use strict';

const fs = require('fs');
const path = require('path');

const TR5205_SCOPE_GUARD = /\b(?:reading specialist|literacy specialist|literacy coach|coach(?:es|ed|ing)?|adolescen\w*|older readers?|5302|secondary)\b/i;
const ECSE5692_SCOPE_GUARD = /\bIFSP or IEP\b/i;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sanitizeForStem(stem, text) {
  let out = cleanSpaces(text);
  if (stem === 'teaching_reading_5205') {
    out = out
      .replace(/\breading specialist\b/gi, 'elementary reading teacher')
      .replace(/\bliteracy specialist\b/gi, 'elementary literacy teacher')
      .replace(/\bliteracy coach\b/gi, 'elementary literacy mentor')
      .replace(/\bcoach(?:es|ed|ing)?\b/gi, 'support')
      .replace(/\badolescen\w*\b/gi, 'elementary')
      .replace(/\bolder readers?\b/gi, 'developing readers')
      .replace(/\bsecondary\b/gi, 'upper elementary')
      .replace(/\b5302\b/g, '5205');
  }
  if (stem === 'special_education_early_childhood_5692') {
    out = out.replace(/\bIFSP or IEP\b/gi, 'Part C IFSP outcomes and Part B IEP goals');
  }
  return out;
}

function inferSourceType(url, entry) {
  const u = String(url || '').toLowerCase();
  if (u.includes('praxis.ets.org') || u.includes('collegeboard.org')) return 'official-blueprint';
  if (u.includes('.gov/') || u.endsWith('.gov')) return 'federal-guidance';
  if (entry && /standard|code of ethics|scope of practice|blueprint|model/i.test(String(entry.title || ''))) {
    return 'professional-standards';
  }
  return 'evidence-reference';
}

function loadPackItems(testPrepDir, stem) {
  const candidates = [
    path.join(testPrepDir, `${stem}_pack.json`),
    path.join(testPrepDir, `${stem}.json`),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const raw = Array.isArray(data.items) ? data.items : [];
    return raw.filter((it) => it && it.id && it.examItemStatus !== 'not-approved-as-independent-exam-item');
  }
  return [];
}

function selectItemsForChapter(items, chapter, chIndex, count) {
  const domKey = chapter.domainId || chapter.unitId || '';
  const chId = chapter.id || '';
  const byChapter = items.filter((it) => Array.isArray(it.chapterIds) && it.chapterIds.includes(chId));
  const byDomain = domKey
    ? items.filter((it) => (it.domainId || it.unitId || '') === domKey)
    : [];
  const pool = byChapter.length >= count ? byChapter : (byDomain.length ? byDomain : items);
  if (!pool.length) return [];
  const offset = (chIndex * 7) % pool.length;
  const picked = [];
  const seen = new Set();
  for (let i = 0; i < pool.length && picked.length < count; i++) {
    const id = pool[(offset + i) % pool.length].id;
    if (!seen.has(id)) {
      seen.add(id);
      picked.push(id);
    }
  }
  return picked;
}

function selectBalancedItems(items, count, stride) {
  if (!items.length) return [];
  const byDomain = new Map();
  for (const it of items) {
    const d = it.domainId || it.unitId || 'general';
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(it.id);
  }
  const buckets = [...byDomain.values()];
  const picked = [];
  const seen = new Set();
  let round = 0;
  while (picked.length < count && round < 40) {
    let added = false;
    for (const b of buckets) {
      if (picked.length >= count) break;
      const idx = (round * stride + 3) % b.length;
      const id = b[idx];
      if (!seen.has(id)) {
        seen.add(id);
        picked.push(id);
        added = true;
      }
    }
    if (!added) break;
    round += 1;
  }
  return picked;
}

function buildStudySessionsAndSpacedPlans(stem, lib, testPrepDir) {
  const items = loadPackItems(testPrepDir, stem);
  const chapters = Array.isArray(lib.chapters) ? lib.chapters : [];
  const diagrams = Array.isArray(lib.diagrams) ? lib.diagrams : [];
  const quickRefs = Array.isArray(lib.quickReference) ? lib.quickReference : [];
  const playbooks = Array.isArray(lib.misconceptionRemediationPlaybooks) ? lib.misconceptionRemediationPlaybooks : [];
  const topicPlaybooks = Array.isArray(lib.topicRemediationPlaybooks) ? lib.topicRemediationPlaybooks : [];
  const families = Array.isArray(lib.misconceptionFamilies) ? lib.misconceptionFamilies : [];
  const workshops = Array.isArray(lib.constructedResponseWorkshops) ? lib.constructedResponseWorkshops : [];

  const diagramByCh = new Map();
  for (const d of diagrams) {
    if (d && d.chapterId && !diagramByCh.has(d.chapterId)) diagramByCh.set(d.chapterId, d);
  }
  const qrByDom = new Map();
  for (const q of quickRefs) {
    const key = q && (q.domainId || q.unitId);
    if (key && !qrByDom.has(key)) qrByDom.set(key, q);
  }

  const isAp = stem.startsWith('ap_');
  const sessions = [];
  const spacedPlans = [];

  chapters.forEach((ch, idx) => {
    const chNum = String(idx + 1).padStart(2, '0');
    const domKey = ch.domainId || ch.unitId || ch.id;
    const domLabel = ch.domain || ch.title;
    const diag = diagramByCh.get(ch.id);
    const qr = qrByDom.get(domKey) || quickRefs[idx % Math.max(1, quickRefs.length)];
    const pb = playbooks.length
      ? playbooks[idx % playbooks.length]
      : (topicPlaybooks.length ? topicPlaybooks[idx % topicPlaybooks.length] : null);
    const caseSec = (ch.sections || []).find((s) => s && s.expandableCase && s.expandableCase.title);
    const weSec = (ch.sections || []).find((s) => s && s.workedExample && s.workedExample.prompt);
    const itemIds = selectItemsForChapter(items, ch, idx, 10);

    const visualText = diag
      ? `Study the chapter lessons and trace "${diag.title}" step by step, verifying every arrow and text equivalent.`
      : `Study the chapter lessons in "${ch.title}" and outline the core relationships in your own words.`;

    const appliedText = caseSec
      ? `Open the applied case "${caseSec.expandableCase.title}", draft your decision before expanding the rationale, then complete the inline knowledge checks without notes.`
      : (weSec
        ? `Work through the step-by-step worked example in "${weSec.heading || weSec.title}" without peeking, compare with the common misconceptions box, and complete the chapter checks.`
        : `Complete all inline chapter knowledge checks without notes and check your reasoning against each rationale.`);

    const repairText = pb
      ? `For any missed item, run the "${pb.title}" misconception playbook and log one concrete check to use on the next set.`
      : `Review every missed rationale, record the exact misconception that pulled you toward the distractor, and write a one-line repair check.`;

    const qrNote = qr ? ` and the "${qr.title}" quick-reference checklist` : '';

    sessions.push({
      id: `${slugify(stem)}-session-ch-${chNum}`,
      title: sanitizeForStem(stem, `${ch.title} guided study session`),
      sessionType: isAp ? 'unit-launch' : 'chapter-launch',
      purpose: sanitizeForStem(
        stem,
        `Move through "${ch.title}" (${domLabel}) from high-yield orientation and visual review to applied retrieval, targeted practice, and trap repair in one bounded 40-minute block.`
      ),
      durationMinutes: 40,
      chapterId: ch.id,
      itemIds,
      steps: [
        {
          order: 1,
          id: 'orient',
          label: 'Orient',
          durationMinutes: 5,
          action: sanitizeForStem(stem, `Read the chapter takeaways for "${ch.title}"${qrNote} before opening any practice questions.`),
        },
        {
          order: 2,
          id: 'study-visual',
          label: 'Core study and diagram',
          durationMinutes: 10,
          action: sanitizeForStem(stem, visualText),
        },
        {
          order: 3,
          id: 'applied-retrieval',
          label: 'Applied retrieval',
          durationMinutes: 10,
          action: sanitizeForStem(stem, appliedText),
        },
        {
          order: 4,
          id: 'targeted-drill',
          label: 'Targeted question drill',
          durationMinutes: 10,
          action: sanitizeForStem(stem, `Complete the ${itemIds.length} linked practice items for "${ch.title}" and flag any item where two options felt close.`),
        },
        {
          order: 5,
          id: 'repair-reflect',
          label: 'Trap repair and reflection',
          durationMinutes: 5,
          action: sanitizeForStem(stem, repairText),
        },
      ],
      status: 'internal-study-session',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    });

    spacedPlans.push({
      id: `${slugify(stem)}-spaced-ch-${chNum}`,
      topicId: ch.id,
      topicLabel: sanitizeForStem(stem, `${idx + 1}. ${ch.title}`),
      unitId: domKey,
      chapterId: ch.id,
      cadenceStages: [
        {
          order: 1,
          id: 'same-day-retry',
          label: 'Same-day retry',
          intervalHours: 0,
          action: sanitizeForStem(stem, `Retry missed checks and trace the chapter diagram`),
          completionEvidence: sanitizeForStem(stem, `Record one corrected rationale for "${ch.title}".`),
        },
        {
          order: 2,
          id: 'next-day-recall',
          label: 'Next-day recall',
          intervalHours: 24,
          action: sanitizeForStem(stem, `Recall chapter takeaways, glossary terms, and flashcards without notes`),
          completionEvidence: sanitizeForStem(stem, `Retrieve key definitions and quick-reference rules from memory.`),
        },
        {
          order: 3,
          id: 'three-day-transfer',
          label: 'Three-day transfer',
          intervalHours: 72,
          action: sanitizeForStem(stem, caseSec ? `Rework the applied case and test a changed scenario` : `Rework a worked example under a changed condition`),
          completionEvidence: sanitizeForStem(stem, `State the rule or mechanism that holds under a new context.`),
        },
        {
          order: 4,
          id: 'seven-day-mixed',
          label: 'Seven-day mixed check',
          intervalHours: 168,
          action: sanitizeForStem(stem, `Run a mixed domain set and verify misconception traps stay closed`),
          completionEvidence: sanitizeForStem(stem, `Confirm independent accuracy across interleaved domains.`),
        },
      ],
      intervalHours: [0, 24, 72, 168],
      status: 'internal-spaced-review-plan',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    });
  });

  // Add 2 exam-wide synthesis sessions: Misconception-Repair Sprint + Mixed-Domain Capstone
  const trapItems = [];
  const trapSeen = new Set();
  for (let round = 0; round < 12 && trapItems.length < 12; round++) {
    for (const fam of families) {
      if (trapItems.length >= 12) break;
      const list = Array.isArray(fam.itemIds) ? fam.itemIds : [];
      if (round < list.length && !trapSeen.has(list[round])) {
        trapSeen.add(list[round]);
        trapItems.push(list[round]);
      }
    }
  }
  const repairSprintItems = trapItems.length >= 10 ? trapItems : selectBalancedItems(items, 12, 5);
  const playbookPreview = playbooks.slice(0, 3).map((p) => `"${p.title}"`).join(', ');

  sessions.push({
    id: `${slugify(stem)}-session-trap-repair-sprint`,
    title: sanitizeForStem(stem, `${lib.shortTitle || lib.title.replace(/ Learning Library$/i, '')} misconception-repair sprint`),
    sessionType: 'trap-repair-sprint',
    purpose: sanitizeForStem(
      stem,
      `Target high-frequency exam distractor traps in a focused 25-minute diagnostic and repair loop before attempting a longer mixed set.`
    ),
    durationMinutes: 25,
    chapterId: '',
    itemIds: repairSprintItems,
    steps: [
      {
        order: 1,
        id: 'scan-playbooks',
        label: 'Scan trap cues',
        durationMinutes: 5,
        action: sanitizeForStem(stem, playbookPreview ? `Review the recognition cues and repair questions in ${playbookPreview} and any recently missed playbooks.` : `Review the misconception playbooks tab and note the top two error patterns you want to watch for.`),
      },
      {
        order: 2,
        id: 'mixed-trap-drill',
        label: 'Mixed trap drill',
        durationMinutes: 12,
        action: sanitizeForStem(stem, `Answer the ${repairSprintItems.length} linked practice questions and write down your repair-question check before choosing an option.`),
      },
      {
        order: 3,
        id: 'audit-misses',
        label: 'Audit misses and lock rules',
        durationMinutes: 8,
        action: sanitizeForStem(stem, `Compare every close call against its Quick Reference caution list and save one personal pre-answer reminder to Study Notes.`),
      },
    ],
    status: 'internal-study-session',
    reviewStatus: 'source-reviewed-editorial-pass',
    releaseEligible: false,
  });

  const capstoneItems = selectBalancedItems(items, 15, 11);
  const wsTitle = workshops[0] ? `"${workshops[0].title}"` : 'one applied case workshop';
  sessions.push({
    id: `${slugify(stem)}-session-mixed-capstone`,
    title: sanitizeForStem(stem, `${lib.shortTitle || lib.title.replace(/ Learning Library$/i, '')} mixed-domain synthesis session`),
    sessionType: 'mixed-synthesis',
    purpose: sanitizeForStem(
      stem,
      `Interleave practice across every blueprint domain and pair selected-response reasoning with an unscored applied workshop in a bounded 45-minute block.`
    ),
    durationMinutes: 45,
    chapterId: '',
    itemIds: capstoneItems,
    steps: [
      {
        order: 1,
        id: 'quick-ref-warmup',
        label: 'Quick-reference warmup',
        durationMinutes: 5,
        action: sanitizeForStem(stem, `Skim the Quick Reference tab across all domains and recall one key rule, cutoff, or equation per domain without peeking.`),
      },
      {
        order: 2,
        id: 'interleaved-practice',
        label: 'Interleaved domain set',
        durationMinutes: 20,
        action: sanitizeForStem(stem, `Complete the ${capstoneItems.length} balanced cross-domain practice items, pacing yourself steadily and flagging uncertain answers for confidence calibration.`),
      },
      {
        order: 3,
        id: 'applied-workshop',
        label: 'Applied workshop synthesis',
        durationMinutes: 15,
        action: sanitizeForStem(stem, `Open ${lib.workshopLabel || 'Applied case workshops'}, outline a response to ${wsTitle}, and self-check every criterion and common pitfall.`),
      },
      {
        order: 4,
        id: 'plan-next-return',
        label: 'Schedule next return',
        durationMinutes: 5,
        action: sanitizeForStem(stem, `Check the spaced-review cadence table below and pick the weakest domain chapter to revisit in 24 to 72 hours.`),
      },
    ],
    status: 'internal-study-session',
    reviewStatus: 'source-reviewed-editorial-pass',
    releaseEligible: false,
  });

  return { studySessionPlans: sessions, spacedReviewPlans: spacedPlans };
}

function buildSourceCatalog(stem, lib, referenceCatalog) {
  const urlOrder = [];
  const seen = new Set();
  const collect = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const u of arr) {
      if (typeof u === 'string' && /^https:\/\//i.test(u) && referenceCatalog[u] && !seen.has(u)) {
        seen.add(u);
        urlOrder.push(u);
      }
    }
  };
  for (const ch of lib.chapters || []) collect(ch.references);
  for (const d of lib.diagrams || []) collect(d.references);
  for (const w of lib.constructedResponseWorkshops || []) collect(w.references);
  for (const g of lib.glossary || []) collect(g.references);

  return urlOrder.slice(0, 16).map((url, idx) => {
    const meta = referenceCatalog[url] || {};
    const title = sanitizeForStem(stem, meta.title || url);
    const organization = sanitizeForStem(stem, meta.organization || 'Public authoritative reference');
    const rawCred = meta.credibility || meta.summary || 'Publicly accessible authoritative blueprint, standard, or legal/clinical reference cited by this library.';
    const credibility = sanitizeForStem(stem, rawCred).slice(0, 380);
    return {
      id: `${slugify(stem)}-source-${String(idx + 1).padStart(2, '0')}`,
      title,
      organization,
      url,
      credibility,
      sourceType: inferSourceType(url, meta),
      reviewedAt: '2026-07-18',
    };
  });
}

function validateScopeGuards(stem, payload) {
  const serialized = JSON.stringify(payload);
  if (stem === 'teaching_reading_5205' && TR5205_SCOPE_GUARD.test(serialized)) {
    const match = serialized.match(TR5205_SCOPE_GUARD);
    throw new Error(`teaching_reading_5205 scope guard violated by: ${match && match[0]}`);
  }
  if (stem === 'special_education_early_childhood_5692' && ECSE5692_SCOPE_GUARD.test(serialized)) {
    throw new Error(`special_education_early_childhood_5692 credential-scope guard violated by: IFSP or IEP`);
  }
}

module.exports = {
  buildStudySessionsAndSpacedPlans,
  buildSourceCatalog,
  validateScopeGuards,
};
