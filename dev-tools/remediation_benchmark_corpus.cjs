'use strict';
// Reuse the portable benchmark's privacy-safe fixtures, without duplicating its engine.
const fs = require('node:fs');
const path = require('node:path');
const portable = require('./benchmark_alloflow_portable.cjs');
const ROOT = path.resolve(__dirname, '..');
function fixtureDefinitions() {
  return [...portable.definitions(ROOT), {
    id: 'worksheet', title: 'Water cycle observation worksheet', documentType: 'handout',
    pdfText: 'Water cycle observation worksheet Observe a covered cup of warm water. Record droplets on the cover. Explain evaporation and condensation.',
    blocks: [
      { type: 'heading', level: 1, text: 'Water cycle observation worksheet', source_page: 1 },
      { type: 'list', ordered: true, items: ['Observe a covered cup of warm water.', 'Record droplets on the cover.', 'Explain evaporation and condensation.'], source_page: 1 },
    ], htmlIncludes: ['Water cycle observation worksheet', 'evaporation and condensation'],
  }, {
    id: 'interactive-form-blocked', title: 'Student response form', documentType: 'form',
    pdfText: 'Student response form Name Date Answer',
    blocks: [{ type: 'heading', level: 1, text: 'Student response form', source_page: 1 }, { type: 'paragraph', text: 'Name Date Answer', source_page: 1 }],
    reviewNotes: ['Interactive field behavior requires the responsible document owner.'],
  }];
}
function materializeFixture(id, directory) {
  const definition = fixtureDefinitions().find(item => item.id === id);
  if (!definition) throw new Error('Unknown portable fixture: ' + id);
  fs.mkdirSync(directory, { recursive: true });
  if (definition.existingSource) return { sourcePath: definition.existingSource, planPath: definition.existingPlan, definition };
  const sourcePath = path.join(directory, id + '.pdf');
  const planPath = path.join(directory, 'repair-plan.json');
  portable.createTextPdf(sourcePath, definition.pdfText);
  if (definition.image) fs.writeFileSync(path.join(directory, 'plant.png'), portable.PNG_1X1);
  fs.writeFileSync(planPath, JSON.stringify(portable.makePlan(sourcePath, definition.title, definition.documentType || 'handout', definition.blocks, definition.reviewNotes || []), null, 2) + '\n');
  return { sourcePath, planPath, definition };
}
module.exports = { fixtureDefinitions, materializeFixture };
