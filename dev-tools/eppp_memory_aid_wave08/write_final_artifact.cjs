const fs = require('node:fs');
const path = require('node:path');

module.exports = function writeFinalArtifact({ root, moduleRoot, manifest, records, canonicalScope }) {
  if (records.length !== 149 || canonicalScope.length !== 149) {
    throw new Error(`Wave 08 final write requires 149 records and 149 fixed-scope items; records=${records.length}, canonicalScope=${canonicalScope.length}`);
  }
  if (Object.values(manifest.domains).some((entry) => entry.status !== 'complete')) {
    throw new Error('Wave 08 final write requires all eight manifest domains to be complete');
  }

  const canonical = [];
  for (const [domainId, entry] of Object.entries(manifest.domains)) {
    const module = JSON.parse(fs.readFileSync(path.join(moduleRoot, entry.module), 'utf8'));
    for (const item of module.items) {
      canonical.push({
        ...item,
        domainId: Number(domainId),
        reviewWave: 'eppp-memory-aid-review-wave-08',
      });
    }
  }
  canonical.sort((left, right) =>
    left.domainId - right.domainId || left.legacyId.localeCompare(right.legacyId),
  );

  const sourceUrls = new Set(canonical.flatMap((item) => item.references));
  const domainCounts = Object.fromEntries(
    Object.keys(manifest.domains).map((domainId) => [
      domainId,
      canonical.filter((item) => item.domainId === Number(domainId)).length,
    ]),
  );
  const artifact = {
    schemaVersion: 1,
    waveId: 'eppp-memory-aid-review-wave-08',
    generatedAt: '2026-07-28T20:00:00.000Z',
    status: 'source-reviewed-editorial-pass-independent-expert-review-pending',
    scope: 'Final modular claim-level source and editorial review of all 149 memory aids remaining after Waves 01-07, composed from eight explicit disjoint domain modules.',
    summary: {
      items: canonical.length,
      domains: 8,
      sourceReviewedEditorialPass: canonical.length,
      independentExpertReviewPending: canonical.length,
      productionValidationPending: canonical.length,
      uniqueSources: sourceUrls.size,
      domainCounts,
    },
    releasePolicy: 'Source/editorial review permits learner rendering but does not constitute independent qualified expert review, psychometric evaluation, legal advice, clinical validation, or production validation.',
    safeguards: [
      'Composition hard-fails unless the fixed Wave 08 scope and the eight complete disjoint modules contain exactly 149 stable records.',
      'Every fixed-scope stable ID is represented exactly once, and every item carries directly aligned provenance in exact reference/source-detail URL order.',
      'Learner-visible content is substantively rewritten and bounded; generic fallback-only approval and legacy-verbatim preservation are not accepted.',
      'Completed modules are normalized and tested for forbidden mojibake markers across content, titles, notes, and provenance fields.',
      'Medication, diagnostic, treatment, statistical, ethical, and legal cues remain recognition aids rather than individual decision or action rules.',
      'Every record remains explicitly gated for independent qualified expert review and production validation.',
    ],
    items: canonical,
  };

  const outputPath = process.env.EPPP_WAVE08_OUTPUT_PATH ? path.resolve(process.env.EPPP_WAVE08_OUTPUT_PATH) : path.join(root, 'test_prep/eppp_memory_aid_review_wave_08.json');
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  if (fs.existsSync(outputPath) && fs.readFileSync(outputPath, 'utf8') === serialized) {
    console.log(`Final memory-aid Wave 08 already current: ${canonical.length} items, ${sourceUrls.size} sources`);
  } else {
    fs.writeFileSync(outputPath, serialized, 'utf8');
    console.log(`Wrote final ${path.relative(root, outputPath)}: ${canonical.length} items, ${sourceUrls.size} sources`);
  }
  return artifact;
};
