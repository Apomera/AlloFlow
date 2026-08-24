#!/usr/bin/env node
// Regenerate catalog/pd/index.json entries from the approved module files.
// Every entry's moduleId/version/language/contentDigest is derived from the
// module itself via PdCore (the same digest startModule verifies), so the
// manifest can never drift from the content it binds. Editorial fields
// (summary excerpts, udlGuidelines tags, paths) live in this script.
const fs = require('fs');
const path = require('path');
const PdCore = require(path.resolve(__dirname, '..', 'pd_core_module.js'));

const ROOT = path.resolve(__dirname, '..');
const APPROVED = path.join(ROOT, 'catalog', 'pd', 'approved');
const INDEX = path.join(ROOT, 'catalog', 'pd', 'index.json');

// Editorial layer: display order, guideline tags, manifest summaries.
// A module absent here still gets an entry (alphabetical, untagged).
const EDITORIAL = {
  'udl-representation-quickstart': { order: 1, udlGuidelines: ['rep_1', 'rep_2', 'rep_3'] },
  'udl-engagement-quickstart': { order: 2, udlGuidelines: ['eng_7', 'eng_8', 'eng_9'] },
  'udl-action-expression-quickstart': { order: 3, udlGuidelines: ['act_4', 'act_5', 'act_6'] },
  'retrieval-practice-quickstart': { order: 4, udlGuidelines: ['rep_3'] },
  'actionable-feedback-quickstart': { order: 5, udlGuidelines: ['eng_8'] },
  'academic-vocabulary-snapshot': { order: 6, udlGuidelines: ['rep_2'] },
  'family-conversations-practice': { order: 7 },
  'deescalation-branching-practice': { order: 8 },
};

const PATHS = [
  {
    slug: 'evidence-based-teaching-essentials',
    title: 'Evidence-Based Teaching Essentials',
    summary: 'Three short modules on practices with strong evidence behind them: retrieval practice, actionable feedback, and multiple means of representation.',
    moduleSlugs: ['retrieval-practice-quickstart', 'actionable-feedback-quickstart', 'udl-representation-quickstart'],
  },
  {
    slug: 'udl-foundations',
    title: 'UDL Foundations',
    summary: 'The three principles of Universal Design for Learning, one short module each: representation, engagement, and action & expression.',
    moduleSlugs: ['udl-representation-quickstart', 'udl-engagement-quickstart', 'udl-action-expression-quickstart'],
  },
  {
    slug: 'responsive-communication',
    title: 'Responsive Communication',
    summary: 'Feedback students can act on, family conversations you can practice live, and de-escalation you can walk one decision at a time.',
    moduleSlugs: ['actionable-feedback-quickstart', 'family-conversations-practice', 'deescalation-branching-practice'],
  },
];

const prior = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const priorBySlug = Object.fromEntries((prior.entries || []).map((e) => [e.slug, e]));

const files = fs.readdirSync(APPROVED).filter((f) => f.endsWith('.json')).sort();
const entries = [];
let failed = false;

for (const file of files) {
  const slug = file.replace(/\.json$/, '');
  const mod = JSON.parse(fs.readFileSync(path.join(APPROVED, file), 'utf8'));
  const v = PdCore.validatePdModule(mod);
  if (!v.ok) { console.error(`FAIL ${slug}: ${v.error}`); failed = true; continue; }
  const readiness = PdCore.auditAccessibilityReadiness(v.module);
  if (readiness.status !== 'ready-for-render-audit') {
    console.error(`FAIL ${slug}: accessibility preflight — ${readiness.issues.map((i) => i.message).join('; ')}`);
    failed = true; continue;
  }
  const md = v.module.metadata;
  const editorial = EDITORIAL[slug] || {};
  const priorEntry = priorBySlug[slug] || {};
  const entry = {
    slug,
    moduleId: md.id,
    version: md.version,
    language: md.language,
    contentDigest: PdCore.moduleContentDigest(v.module),
    title: md.title,
    topic: md.topic,
    summary: priorEntry.summary || md.summary, // manifest summaries are editorial; keep reviewed wording
    estMinutes: md.estMinutes,
    credit: md.credit,
    license: md.license,
    audience: md.audience,
    path: `catalog/pd/approved/${file}`,
  };
  if (editorial.udlGuidelines) entry.udlGuidelines = editorial.udlGuidelines;
  entry._order = editorial.order ?? 999;
  entries.push(entry);
}

if (failed) { console.error('Manifest NOT written.'); process.exit(1); }

entries.sort((a, b) => a._order - b._order || a.slug.localeCompare(b.slug));
entries.forEach((e) => delete e._order);

const manifest = {
  schema_version: prior.schema_version || '1.0',
  kind: prior.kind || 'pd_catalog',
  generated_at: new Date().toISOString(),
  entries,
  paths: PATHS,
};

fs.writeFileSync(INDEX, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${entries.length} entries, ${PATHS.length} paths -> ${path.relative(ROOT, INDEX)}`);
