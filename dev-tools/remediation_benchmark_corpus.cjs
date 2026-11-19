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
  }, {
    id: 'rtl-bilingual-inline', title: 'رسالة ترحيب مدرسية', documentType: 'handout', language: 'ar',
    pdfText: 'Welcome family notice with WCAG guidance',
    blocks: [
      { type: 'heading', level: 1, text: 'رسالة ترحيب مدرسية', source_page: 1 },
      {
        type: 'paragraph',
        text: 'يرجى مراجعة معيار WCAG قبل المشاركة.',
        runs: [
          { text: 'يرجى مراجعة معيار ', style: 'normal' },
          { text: 'WCAG', style: 'strong', lang: 'en' },
          { text: ' قبل المشاركة.', style: 'normal' },
        ],
        source_page: 1,
      },
    ],
    htmlIncludes: ['<html lang="ar" dir="rtl">', '<span lang="en"><strong>WCAG</strong></span>'],
  }, {
    id: 'spanned-table-h43', title: 'District Support Matrix', documentType: 'report',
    pdfText: 'District Support Matrix Term Details Fall Math Room 101 Science Summary All rooms accessible',
    blocks: [
      { type: 'heading', level: 1, text: 'District Support Matrix', source_page: 1 },
      {
        type: 'table',
        caption: 'Spanned Support Schedule',
        columns: [{ text: 'Term', colspan: 1 }, { text: 'Details', colspan: 2 }],
        rows: [
          [{ text: 'Fall', rowspan: 2, header: true }, 'Math', 'Room 101'],
          ['Science', ''],
          [{ text: 'Summary', header: true }, { text: 'All rooms accessible', colspan: 2 }],
        ],
        source_page: 1,
      },
    ],
    htmlIncludes: ['colspan="2"', 'rowspan="2"', 'headers="', '&#160;'],
  }, {
    id: 'nested-list-code-formula', title: 'STEM Lab Reference', documentType: 'handout',
    pdfText: 'STEM Lab Reference Prepare materials Collect water sample Record observations def area return Area equals pi times radius squared',
    blocks: [
      { type: 'heading', level: 1, text: 'STEM Lab Reference', source_page: 1 },
      {
        type: 'list',
        ordered: true,
        items: [
          { text: 'Prepare materials', children: { ordered: false, items: ['Collect water sample', 'Label container'] } },
          'Record observations',
        ],
        source_page: 1,
      },
      { type: 'code', language: 'python', caption: 'Area helper', text: 'def area(r):\n    return 3.14159 * r * r', source_page: 1 },
      {
        type: 'formula',
        alt_text: 'Area equals pi times radius squared',
        mathml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>A</mi><mo>=</mo><mi>π</mi><msup><mi>r</mi><mn>2</mn></msup></math>',
        caption: 'Circle area equation',
        source_page: 1,
      },
    ],
    htmlIncludes: ['<ul><li>Collect water sample</li>', '<pre aria-describedby=', 'role="math"', '<math xmlns="http://www.w3.org/1998/Math/MathML"'],
  }, {
    id: 'signed-legal-blocked', title: 'Executed Agreement Record', documentType: 'legal-record',
    pdfText: 'Executed Agreement Record Signed by authorized representative',
    blocks: [
      { type: 'heading', level: 1, text: 'Executed Agreement Record', source_page: 1 },
      { type: 'paragraph', text: 'Signed by authorized representative.', source_page: 1 },
    ],
    reviewNotes: ['Signed legal records require the responsible document owner and cannot be automatically rebuilt.'],
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
  fs.writeFileSync(planPath, JSON.stringify(portable.makePlan(sourcePath, definition.title, definition.documentType || 'handout', definition.blocks, definition.reviewNotes || [], definition.language), null, 2) + '\n');
  return { sourcePath, planPath, definition };
}
module.exports = { fixtureDefinitions, materializeFixture };
