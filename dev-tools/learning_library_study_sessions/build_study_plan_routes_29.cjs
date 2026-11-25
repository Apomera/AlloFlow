'use strict';

const fs = require('fs');
const path = require('path');
const { validateScopeGuards } = require('./build_study_sessions_and_sources.cjs');

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

function partitionDomainBalanced(items, bucketCount, maxPerBucket) {
  const byDomain = new Map();
  for (const it of items) {
    const d = it.domainId || it.unitId || 'general';
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(it);
  }
  const buckets = Array.from({ length: bucketCount }, () => []);
  const domainLists = [...byDomain.values()];
  let cursor = 0;
  let added = true;
  const maxLen = Math.max(0, ...domainLists.map((l) => l.length));
  for (let row = 0; row < maxLen && added; row++) {
    added = false;
    for (const list of domainLists) {
      if (row >= list.length) continue;
      const bIdx = cursor % bucketCount;
      cursor += 1;
      if (buckets[bIdx].length < maxPerBucket) {
        buckets[bIdx].push(list[row]);
        added = true;
      }
    }
  }
  return buckets;
}

function buildStudyPlanRoutes(stem, lib, testPrepDir) {
  const items = loadPackItems(testPrepDir, stem);
  const chapters = Array.isArray(lib.chapters) ? lib.chapters : [];
  const playbooks = Array.isArray(lib.misconceptionRemediationPlaybooks) ? lib.misconceptionRemediationPlaybooks : [];
  const isAp = stem.startsWith('ap_');
  const shortLabel = lib.shortTitle || String(lib.title || stem).replace(/ Learning Library$/i, '');

  const itemsByChapter = new Map();
  const itemsByDomain = new Map();
  for (const it of items) {
    const d = it.domainId || it.unitId || 'general';
    if (!itemsByDomain.has(d)) itemsByDomain.set(d, []);
    itemsByDomain.get(d).push(it.id);
    if (Array.isArray(it.chapterIds)) {
      for (const chId of it.chapterIds) {
        if (!itemsByChapter.has(chId)) itemsByChapter.set(chId, []);
        itemsByChapter.get(chId).push(it.id);
      }
    }
  }

  // 1. Unit / Chapter Review Routes (1 per chapter)
  const unitReviewRoutes = chapters.map((ch, idx) => {
    const chNum = String(idx + 1).padStart(2, '0');
    const domKey = ch.domainId || ch.unitId || ch.id;
    const domLabel = ch.domain || ch.title;
    const chPool = itemsByChapter.get(ch.id) || [];
    const domPool = itemsByDomain.get(domKey) || [];
    const basePool = chPool.length >= 12 ? chPool : (domPool.length ? domPool : items.map((i) => i.id));
    // Cap unit review at 45 items max, rotating offset by chapter so sibling chapters in the same domain feature distinct slices
    const cap = Math.min(45, basePool.length);
    const offset = chPool.length >= 12 ? 0 : (idx * 13) % Math.max(1, basePool.length);
    const unitItemIds = [];
    const seen = new Set();
    for (let i = 0; i < basePool.length && unitItemIds.length < cap; i++) {
      const id = basePool[(offset + i) % basePool.length];
      if (!seen.has(id)) {
        seen.add(id);
        unitItemIds.push(id);
      }
    }
    const mixedCount = Math.min(12, unitItemIds.length);
    const mixedPracticeItemIds = unitItemIds.slice(0, mixedCount);

    const sectionTopics = (ch.sections || []).map((s) => s.id).filter(Boolean);
    return {
      id: `${slugify(stem)}-unit-review-${chNum}`,
      unitId: domKey,
      unitNumber: idx + 1,
      unitLabel: sanitizeForStem(stem, `${isAp ? 'Unit' : 'Chapter'} ${idx + 1}: ${ch.title}`),
      chapterId: ch.id,
      topicDiagnosticRouteIds: sectionTopics,
      itemIds: unitItemIds,
      mixedPracticeItemIds,
      purpose: sanitizeForStem(
        stem,
        `Consolidate "${ch.title}" (${domLabel}) across ${sectionTopics.length} lessons and ${unitItemIds.length} linked internal practice items, pairing chapter review with mixed retrieval.`
      ),
      status: 'internal-unit-review-route',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    };
  });

  // 2. Cumulative Review Ladders (3 progressive tiers balanced across all domains)
  const ladderSize = Math.min(40, Math.max(20, Math.floor(items.length / 4)));
  const ladderBuckets = partitionDomainBalanced(items, 3, ladderSize);
  const domainLabels = [...new Set(chapters.map((c) => c.domain || c.title).filter(Boolean))];
  const focusSlice = (start, count) => {
    const out = [];
    for (let i = 0; i < count && domainLabels.length; i++) {
      out.push(sanitizeForStem(stem, domainLabels[(start + i) % domainLabels.length]));
    }
    return [...new Set(out)];
  };
  const trapFocus = playbooks.slice(0, 3).map((p) => sanitizeForStem(stem, p.familyLabel || p.title)).filter(Boolean);

  const reviewLadders = [
    {
      id: `${slugify(stem)}-ladder-01-foundation`,
      order: 1,
      label: 'Foundation core concepts and rules',
      studyMode: 'foundation',
      purpose: sanitizeForStem(
        stem,
        `Build reliable foundational recall, core definitions, and baseline decision rules across all ${shortLabel} blueprint domains.`
      ),
      focus: focusSlice(0, 4),
      itemIds: ladderBuckets[0].map((i) => i.id),
      status: 'internal-review-ladder',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: `${slugify(stem)}-ladder-02-application`,
      order: 2,
      label: 'Applied case, evidence, and data reasoning',
      studyMode: 'application',
      purpose: sanitizeForStem(
        stem,
        `Apply ${shortLabel} frameworks, quantitative or diagnostic criteria, and evidence triangulation across varied scenario contexts.`
      ),
      focus: focusSlice(2, 4),
      itemIds: ladderBuckets[1].map((i) => i.id),
      status: 'internal-review-ladder',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: `${slugify(stem)}-ladder-03-cumulative-transfer`,
      order: 3,
      label: 'Cumulative cross-domain synthesis and trap checks',
      studyMode: 'transfer',
      purpose: sanitizeForStem(
        stem,
        `Interleave every ${shortLabel} domain under mixed conditions while actively guarding against high-frequency exam distractor traps.`
      ),
      focus: trapFocus.length >= 2 ? trapFocus : focusSlice(4, 4),
      itemIds: ladderBuckets[2].map((i) => i.id),
      status: 'internal-review-ladder',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ];

  // 3. Balanced Internal Practice Forms (3 non-overlapping domain-balanced forms: A, B, C)
  const formSize = Math.min(50, Math.max(25, Math.floor(items.length / 3)));
  const formBuckets = partitionDomainBalanced(items, 3, formSize);
  const formLetters = ['A', 'B', 'C'];
  const practiceForms = formBuckets.map((bucket, idx) => {
    const unitSet = new Set();
    const topicSet = new Set();
    for (const it of bucket) {
      if (it.domainId || it.unitId) unitSet.add(it.domainId || it.unitId);
      if (Array.isArray(it.chapterIds) && it.chapterIds.length) {
        it.chapterIds.forEach((c) => topicSet.add(c));
      } else if (it.topicId) {
        topicSet.add(it.topicId);
      } else if (it.skillId) {
        topicSet.add(it.skillId);
      }
    }
    if (topicSet.size === 0) chapters.forEach((c) => topicSet.add(c.id));
    if (unitSet.size === 0) chapters.forEach((c) => unitSet.add(c.domainId || c.unitId || c.id));
    return {
      id: `${slugify(stem)}-form-internal-${formLetters[idx].toLowerCase()}`,
      title: sanitizeForStem(stem, `Internal practice form ${formLetters[idx]} (${shortLabel})`),
      formType: 'internal-selected-response-form',
      itemIds: bucket.map((i) => i.id),
      topicIds: [...topicSet],
      unitIds: [...unitSet],
      status: 'internal-practice-form',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    };
  });

  const result = { unitReviewRoutes, reviewLadders, practiceForms };
  validateScopeGuards(stem, result);
  return result;
}

module.exports = {
  buildStudyPlanRoutes,
};
