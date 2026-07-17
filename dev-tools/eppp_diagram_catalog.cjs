'use strict';

const fs = require('fs');
const path = require('path');

const REVIEW_WAVE_PATTERN = /^eppp_diagram_review_wave_\d+\.json$/i;
const ALLOWED_REVIEW_STATUSES = new Set([
  'review-required',
  'editorial-reviewed-source-pending',
  'source-reviewed-editorial-pass',
]);

function cleanText(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function normalizeSources(value) {
  return (Array.isArray(value) ? value : []).map((source) => ({
    title: cleanText(source && source.title),
    organization: cleanText(source && source.organization),
    url: cleanText(source && source.url),
    whyReputable: cleanText(source && source.whyReputable),
  })).filter((source) => source.title && source.organization && source.url && source.whyReputable);
}

function normalizeChecks(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .map(([key, status]) => [cleanText(key), cleanText(status)])
    .filter(([key, status]) => key && status));
}

function loadDiagramReviewWaves(root) {
  const artifactRoot = path.join(root, 'test_prep');
  const records = new Map();
  if (!fs.existsSync(artifactRoot)) return records;

  for (const filename of fs.readdirSync(artifactRoot).filter((entry) => REVIEW_WAVE_PATTERN.test(entry)).sort()) {
    const artifact = JSON.parse(fs.readFileSync(path.join(artifactRoot, filename), 'utf8'));
    if (!Array.isArray(artifact.items)) throw new Error(`Diagram review wave ${filename} must contain an items array.`);
    for (const item of artifact.items) {
      const key = cleanText(item && item.key);
      const reviewStatus = cleanText(item && item.reviewStatus) || 'review-required';
      if (!key) throw new Error(`Diagram review wave ${filename} has an item without a template key.`);
      if (records.has(key)) throw new Error(`Diagram template ${key} appears in more than one review wave.`);
      if (!ALLOWED_REVIEW_STATUSES.has(reviewStatus)) throw new Error(`Diagram template ${key} has unsupported review status ${reviewStatus}.`);
      const sourceDetails = normalizeSources(item && item.sourceDetails);
      if (reviewStatus === 'source-reviewed-editorial-pass' && sourceDetails.length === 0) {
        throw new Error(`Source-reviewed diagram template ${key} requires complete sourceDetails.`);
      }
      records.set(key, {
        reviewStatus,
        reviewNote: cleanText(item && item.reviewNote),
        references: (Array.isArray(item && item.references) ? item.references : []).map(cleanText).filter(Boolean),
        sourceDetails,
        checks: normalizeChecks(item && item.checks),
        reviewArtifact: filename,
        reviewWave: cleanText(item && item.reviewWave) || cleanText(artifact.reviewWave),
        reviewDate: cleanText(item && item.reviewDate) || cleanText(artifact.reviewDate),
      });
    }
  }
  return records;
}

function baselineChecks(diagram) {
  return {
    textAlternative: cleanText(diagram && diagram.description) ? 'shared-renderer-pass-content-review-pending' : 'review-required',
    reducedMotion: 'shared-renderer-pass',
    keyboardDependency: 'shared-renderer-pass',
    conceptAccuracy: 'pending',
    labelQuality: 'pending',
    sourceSupport: 'pending',
    expertReview: 'pending-independent-review',
  };
}

function reviewMetadata(review, diagram) {
  const effective = review || {};
  return {
    reviewStatus: effective.reviewStatus || 'review-required',
    reviewNote: effective.reviewNote || '',
    references: effective.references || [],
    sourceDetails: effective.sourceDetails || [],
    reviewArtifact: effective.reviewArtifact || '',
    reviewWave: effective.reviewWave || '',
    reviewDate: effective.reviewDate || '',
    checks: { ...baselineChecks(diagram), ...(effective.checks || {}) },
  };
}

function buildDiagramCatalog({ root, chapters, diagramTemplates, chapterSourceById = new Map() }) {
  const templates = Object.entries(diagramTemplates || {});
  const templateKeyByObject = new Map(templates.map(([key, diagram]) => [diagram, key]));
  const reviewByKey = loadDiagramReviewWaves(root);
  for (const key of reviewByKey.keys()) {
    if (!Object.prototype.hasOwnProperty.call(diagramTemplates, key)) throw new Error(`Diagram review wave references unknown template ${key}.`);
  }

  const placements = [];
  for (const [chapterIndex, chapter] of (Array.isArray(chapters) ? chapters : []).entries()) {
    const chapterId = String(chapter && chapter.id || `chapter-${chapterIndex + 1}`);
    const chapterTitle = cleanText(chapter && chapter.title) || 'Untitled chapter';
    const sections = Array.isArray(chapter && chapter.sections) ? chapter.sections : [];
    for (const [sectionIndex, section] of sections.entries()) {
      const diagram = section && section.interactiveDiagram;
      if (!diagram) continue;
      const sectionId = `${chapterId}-section-${sectionIndex}`;
      const templateKey = templateKeyByObject.get(diagram) || '';
      const origin = templateKey ? 'shared-template' : 'inline';
      const placementId = `diagram-placement-${slug(chapterId)}-section-${String(sectionIndex + 1).padStart(2, '0')}`;
      const diagramId = templateKey ? `diagram-${slug(templateKey)}` : `diagram-inline-${slug(chapterId)}-section-${String(sectionIndex + 1).padStart(2, '0')}`;
      placements.push({
        id: placementId,
        diagramId,
        origin,
        templateKey: templateKey || null,
        chapterId,
        chapterTitle,
        legacySource: chapterSourceById.get(chapterId) || '',
        sectionId,
        sectionIndex: sectionIndex + 1,
        sectionHeading: cleanText(section && section.heading) || 'Untitled section',
        title: cleanText(diagram && diagram.title),
        description: cleanText(diagram && diagram.description),
        hasSvg: /<svg\b/i.test(String(diagram && diagram.svg || '')),
        ...reviewMetadata(templateKey ? reviewByKey.get(templateKey) : null, diagram),
      });
    }
  }

  const placementIds = new Set(placements.map((placement) => placement.id));
  const diagramIds = new Set(placements.map((placement) => placement.diagramId));
  if (placementIds.size !== placements.length) throw new Error('Diagram placement IDs must be unique.');
  if (diagramIds.size !== placements.length) {
    const sharedReuseIsValid = placements.every((placement, index) => placements.findIndex((candidate) => candidate.diagramId === placement.diagramId) === index || placement.origin === 'shared-template');
    if (!sharedReuseIsValid) throw new Error('Inline diagram IDs must be unique.');
  }

  const templateRecords = templates.map(([key, diagram]) => {
    const templatePlacements = placements.filter((placement) => placement.templateKey === key);
    return {
      id: `diagram-${slug(key)}`,
      key,
      origin: 'shared-template',
      description: cleanText(diagram && diagram.description),
      hasSvg: /<svg\b/i.test(String(diagram && diagram.svg || '')),
      usageStatus: templatePlacements.length ? 'used' : 'unused',
      placementCount: templatePlacements.length,
      placementIds: templatePlacements.map((placement) => placement.id),
      ...reviewMetadata(reviewByKey.get(key), diagram),
    };
  });

  return {
    templates: templateRecords,
    placements,
    summary: {
      diagramTemplates: templateRecords.length,
      usedDiagramTemplates: templateRecords.filter((template) => template.usageStatus === 'used').length,
      unusedDiagramTemplates: templateRecords.filter((template) => template.usageStatus === 'unused').length,
      diagramPlacements: placements.length,
      sharedTemplateDiagramPlacements: placements.filter((placement) => placement.origin === 'shared-template').length,
      inlineDiagramPlacements: placements.filter((placement) => placement.origin === 'inline').length,
      sourceReviewedDiagramTemplates: templateRecords.filter((template) => template.reviewStatus === 'source-reviewed-editorial-pass').length,
      sourceReviewedDiagramPlacements: placements.filter((placement) => placement.reviewStatus === 'source-reviewed-editorial-pass').length,
    },
  };
}

module.exports = { buildDiagramCatalog, cleanText, loadDiagramReviewWaves, slug };
