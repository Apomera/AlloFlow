'use strict';
const fs = require('node:fs');
function edit(file, transform) {
  const original = fs.readFileSync(file, 'utf8'), crlf = original.includes('\r\n');
  const changed = transform(original.replace(/\r\n/g, '\n'));
  if (changed === original.replace(/\r\n/g, '\n')) throw Error('No change: ' + file);
  fs.writeFileSync(file, crlf ? changed.replace(/\n/g, '\r\n') : changed);
}
function replace(s, before, after) { if (!s.includes(before)) throw Error('Anchor missing: ' + before); return s.replace(before, after); }
edit('dev-tools/calibrate_rendered_fidelity.cjs', s => {
  s = replace(s, "const cases = require(corpusPath);", "const extendedCorpusPath = path.resolve(__dirname, '../tests/fixtures/rendered_fidelity/extended_cases.cjs');\n  const corpusPaths = [corpusPath, extendedCorpusPath];\n  const cases = corpusPaths.flatMap(file => require(file));");
  s = replace(s, 'const results = [];', 'const results = [], reports = [];');
  s = replace(s, "      results.push({ id: fixture.id", "      reports.push({ id: fixture.id, ...report });\n      results.push({ id: fixture.id");
  s = replace(s, 'durationMs: report.durationMs, evidence:', 'profiles: report.profiles?.map(profile => ({ id: profile.id, status: profile.status })), durationMs: report.durationMs, evidence:');
  s = replace(s, "corpusSha256: crypto.createHash('sha256').update(fs.readFileSync(corpusPath)).digest('hex'),", "corpusSha256: crypto.createHash('sha256').update(JSON.stringify(corpusPaths.map(file => ({ name: path.basename(file), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })))).digest('hex'),\n    corpusFiles: corpusPaths.map(file => ({ path: path.relative(path.resolve(__dirname, '..'), file).replace(/\\\\/g, '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })),");
  s = replace(s, '  return summary;', "  fs.writeFileSync(path.join(output, 'review.html'), require('./rendered_fidelity_review.cjs').renderReview({ reports }));\n  return summary;");
  return s;
});
edit('docs/rendered-document-fidelity.md', s => {
  s = replace(s, 'Script-dependent documents and unresolved external resources produce incomplete coverage.', 'Script-dependent documents, unresolved resources (including unloaded media and responsive image sets), and active or delayed animations produce incomplete coverage.');
  s = replace(s, 'browser version, viewport, selected properties, and timing.', 'browser version, rendering profiles, selected properties, and timing.');
  s = replace(s, 'Use a fresh output directory.', 'The command writes `rendered-fidelity.json` and a self-contained `review.html`. The HTML report shows selected source/candidate observations, incomplete-coverage reasons, and exact artifact hashes. It renders document content as escaped text and needs no scripts or external assets.\n\nUse a fresh output directory.');
  s = replace(s, 'Existing names, text, and selected form properties otherwise require equality.', 'Existing names, text, and selected form properties otherwise require equality. Text uses Unicode canonical normalization (NFC), preserving meaningful differences such as `x²` versus `x2`.');
  s = replace(s, 'There are limits of 8 MiB per document, 100 checkpoints per comparison, and 50 pairs per CLI manifest.', 'There are limits of 8 MiB per document, 100 checkpoints per profile, 4 profiles per pair, and 50 pairs per CLI manifest.');
  s = replace(s, '## Existing export acceptance reports', `## Desktop, mobile, and print checks

Replace a pair's single \`viewport\` with explicit profiles to check responsive and print styles:

\`\`\`json
"profiles": [
  { "id": "desktop", "viewport": { "width": 1100, "height": 800 }, "media": "screen" },
  { "id": "mobile", "viewport": { "width": 390, "height": 844 }, "media": "screen" },
  { "id": "print", "viewport": { "width": 1100, "height": 800 }, "media": "print" }
]
\`\`\`

Do not combine \`profiles\` with top-level \`viewport\` or \`media\`. IDs must be unique. The default remains one 1100×800 screen profile. Each profile uses separate source/candidate contexts and the same source-authored checkpoints. Print emulation checks CSS media behavior; it does not assess PDF pagination or printed-page layout. A mobile profile changes viewport dimensions, not touchscreen or mobile browser behavior.

Every profile must pass for the aggregate to pass. A detected difference takes priority as \`review-required\`, while \`coverage.complete\` remains false if any checkpoint property or rendering dependency was unavailable. The report retains both facts and identifies the affected profile. Selected-checkpoint coverage never means whole-document coverage.

## Existing export acceptance reports`);
  s = replace(s, 'The source path is relative to the manifest.', 'The same optional `profiles` array can be included inside `sourceFidelity`. The CLI writes `rendered-fidelity-review.html` when rendered reports are present.\n\nThe source path is relative to the manifest.');
  s = replace(s, 'test tests/e2e/rendered_document_fidelity.spec.ts --workers=1 --retries=0', 'test tests/e2e/rendered_document_fidelity.spec.ts tests/e2e/rendered_fidelity_profiles.spec.ts --workers=1 --retries=0');
  s = replace(s, 'The corpus in `tests/fixtures/rendered_fidelity/cases.cjs` contains 20 authored HTML pairs across tables, CSS/visibility, forms, links, math, and multilingual content: five valid repairs, fourteen harmful changes, and one external-resource case.', 'The corpus in `tests/fixtures/rendered_fidelity/cases.cjs` and `extended_cases.cjs` contains 29 authored HTML pairs across tables, CSS/visibility, responsive and print styles, forms, links, math, Unicode, figures, and media dependencies: eight valid repairs, eighteen harmful changes, and three intentionally unavailable cases.');
  s = replace(s, 'plus corpus/implementation hashes and aggregate metrics.', 'plus corpus/implementation hashes, aggregate metrics, and a combined `review.html`.');
  s = replace(s, 'Additional viewports, PDF semantics, scans, figures, and actual screen-reader sessions', 'Representative documents, PDF semantics, scans, figure-description quality, and actual screen-reader sessions');
  return s;
});
