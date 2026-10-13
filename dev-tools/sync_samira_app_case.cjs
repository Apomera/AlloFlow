const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'maine_sld_case_data.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const record = read(path.join(__dirname, 'samira_complete_record.json'));
const key = read(path.join(__dirname, 'samira_complete_key.json'));
const data = read(dataPath);
const originalCases = structuredClone(data.cases.filter(c => c.id !== 'samira'));
const samira = data.cases.find(c => c.id === 'samira');
assert.ok(samira, 'Samira must already exist');
assert.equal(record.caseId, 'samira');
assert.equal(key.caseId, 'samira');
assert.deepEqual(record.sections.map(s => s.id), Array.from({ length: 9 }, (_, i) => 'S' + (i + 1)));
assert.deepEqual(key.sections.map(s => s.id), Array.from({ length: 9 }, (_, i) => 'Q' + (i + 1)));

function flattenSection(section) {
  return [
    ...section.paragraphs,
    ...(section.table ? section.table.rows.map(row => row.map((cell, i) => section.table.headers[i] + ': ' + cell).join(' | ')) : []),
    ...(section.notes || [])
  ].join('\n\n');
}

const responseValues = ['NO', 'NO', 'ALL_NO', 'YES', 'NARRATIVE', 'NARRATIVE', 'YES', 'YES', 'Q9A'];
const processing = record.sections.find(s => s.id === 'S5').table.rows;
const scoreIds = ['nonverbal-index', 'visual-spatial', 'fluid-reasoning', 'processing-speed', 'phonological-awareness', 'phonological-memory', 'rapid-symbolic-naming'];
const previousRecord = samira.previousRecord || {
  version: 'excerpt-1.2.1',
  narrative: structuredClone(samira.narrative),
  evidenceSupplement: structuredClone(samira.evidenceSupplement),
  scoreRowIds: structuredClone(samira.scoreRowIds || []),
  extraScoreRows: structuredClone(samira.extraScoreRows || []),
  inlineScores: structuredClone(samira.inlineScores || [])
};

const expected = {
  ...samira,
  title: 'Samira, Grade 4: complete multilingual reading record',
  practiceFocus: 'Complete SLD-form evidence, multilingual assessment and necessary instruction',
  narrative: structuredClone(record.overview),
  evidenceSupplement: record.sections.map(section => ({ id: section.id, title: section.id + ': ' + section.title, text: flattenSection(section) })),
  assumptions: [],
  scoreRowIds: [],
  extraScoreRows: processing.map((row, i) => ({
    id: 'samira-' + scoreIds[i],
    label: row[0].replace(/^(WISC-V|CTOPP-2) /, ''),
    value: Number(row[1]),
    scaleId: 'standard',
    test: i < 4 ? 'WISC-V' : 'CTOPP-2',
    comparison: 'age-based',
    administrationDate: i < 4 ? '2026-09-16' : '2026-09-17',
    fictional: true,
    sourceId: 'S5',
    interpretation: row[2]
  })),
  scoreGuidance: 'S5 supplies seven fictional age-based processing composites (mean 100, SD 15), with administration and interpretation limits in S5/S9. They are independently authored report results, not calculated from secured protocols. NVI is not FSIQ; overlapping indexes are not independent replications. Exact Arabic-English norm representativeness is not established. Use scores only for their bounded, corroborated purposes, not as a language-independent diagnosis or score cutoff. S4 uses district summative and performance evidence for achievement; classroom task counts, local criteria and ACCESS proficiency levels are not standard scores or eligibility thresholds.',
  evidencePrompt: 'Use sources S1-S9 to connect each SLD-form entry to supplied evidence and its limitations. Distinguish independent reading, supported content access and English-language development; explain the necessary teaching adaptations separately from the disability conclusion.',
  scoreRecordMetadata: { comparison: 'Age-based processing composites; achievement uses district summative and performance evidence', ageAtEvaluation: '9 years, 8 months', grade: 4 },
  focusSteps: key.sections.map(section => section.id),
  tasks: record.tasks.map((prompt, i) => ({ id: ['complete-form', 'source-streams', 'instruction-need'][i], prompt })),
  recommendedResponses: Object.fromEntries(key.sections.map((section, i) => [section.id, {
    response: responseValues[i],
    responseLabel: section.selection,
    feedback: section.entry + ' ' + section.rationale,
    status: 'provisional'
  }])),
  debrief: {
    summary: key.summary,
    q9Example: key.sections.find(section => section.id === 'Q9').entry,
    familyExplanation: key.familyExample,
    caution: key.qualityNotes[3],
    nextEvidence: structuredClone(key.followUp)
  },
  completeRecord: structuredClone(record),
  facilitatorKey: structuredClone(key),
  previousRecord
};
if (Object.hasOwn(expected, 'inlineScores')) expected.inlineScores = [];
const expectedMetadata = {
  ...data.metadata,
  version: '1.3.0',
  compatibleWorksheetVersions: [...new Set([...data.metadata.compatibleWorksheetVersions, '1.2.1'])],
  samiraRecordVersion: record.version,
  caseDesignReview: 'Reviewed each case against the current posted Maine SLD form/checklist. Samira now uses the complete fictional source record, edition ' + record.version + ', and matching worked key shared with the PDF worksheet, covering Q1-Q9 and documented interpretation limits. Other cases retain their stated evidence and training assumptions. Not an independent specialist validation; original score fixtures are preserved.'
};
const disclosure = 'Samira uses the complete fictional S1-S9 record and matching facilitator key shared with the PDF worksheet; Marisol retains unresolved evidence. Multilingual status predicts neither outcome. Classroom-task counts describe the stated task and support conditions only and are not standard scores, norms or eligibility thresholds.';
const expectedDisclosures = data.disclosures.map(value => value.startsWith("Samira's record illustrates") || value.startsWith('Samira uses the complete fictional S1-S9 record') ? disclosure : value);

if (process.argv.includes('--check')) {
  assert.deepEqual(samira, expected, 'Samira app content has drifted from the shared worksheet/key sources; run node dev-tools/sync_samira_app_case.cjs');
  assert.deepEqual(data.metadata, expectedMetadata, 'Samira synchronization metadata is stale');
  assert.deepEqual(data.disclosures, expectedDisclosures, 'Samira disclosure is stale');
  assert.equal(samira.completeRecord.sections.length, 9);
  assert.equal(samira.facilitatorKey.sections.find(s => s.id === 'Q1').parts.length, 8);
  assert.equal(samira.facilitatorKey.sections.find(s => s.id === 'Q3').parts.length, 4);
  assert.equal(samira.facilitatorKey.sections.find(s => s.id === 'Q4').parts.length, 4);
  assert.ok(samira.facilitatorKey.sections.find(s => s.id === 'Q4').parts.every(p => p.strengths && p.weaknesses));
  assert.deepEqual(samira.extraScoreRows.map(row => row.value), [102, 105, 103, 98, 79, 94, 82]);
  assert.equal(samira.previousRecord.version, 'excerpt-1.2.1');
  assert.ok(samira.previousRecord.evidenceSupplement.length, 'Keep the earlier source labels available for saved-note migration');
  console.log('Samira app/PDF source and answer-key alignment passed (S1-S9, Q1-Q9, seven processing composites).');
} else {
  data.cases[data.cases.findIndex(c => c.id === 'samira')] = expected;
  data.metadata = expectedMetadata;
  data.disclosures = expectedDisclosures;
  assert.deepEqual(data.cases.filter(c => c.id !== 'samira'), originalCases, 'Other cases must not change');
  const source = fs.readFileSync(dataPath, 'utf8');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(dataPath, (JSON.stringify(data, null, 2) + '\n').replace(/\n/g, newline), 'utf8');
  console.log('Synced Samira app case from shared worksheet/key JSON; all other cases preserved.');
}
