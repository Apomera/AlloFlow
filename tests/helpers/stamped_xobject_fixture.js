// Runtime-generated PDF fixture for Form XObject extraction (corpus round 8).
//
// One page whose content stream:
//   * draws Form XObject /Fm0 THREE times via `Do`, with page text between the
//     draws, so both the repeat count and the stream ORDER are observable; and
//   * lists /Fm0 in the page resources, where /Fm0's own resource dictionary
//     points back at the page's — the self-reference that made the old
//     dict-walking extractor emit a stamp's text several times per page.
//
// Correct output therefore contains STAMP exactly three times, interleaved as
// ALPHA STAMP BETA STAMP GAMMA STAMP.
import { Buffer } from 'node:buffer';

export function buildStampedXObjectPdf() {
  const stamp = 'BT /F1 12 Tf 10 10 Td (STAMP) Tj ET';
  const content = [
    'BT /F1 12 Tf 72 700 Td (ALPHA) Tj ET',
    'q 1 0 0 1 72 680 cm /Fm0 Do Q',
    'BT /F1 12 Tf 72 660 Td (BETA) Tj ET',
    'q 1 0 0 1 72 640 cm /Fm0 Do Q',
    'BT /F1 12 Tf 72 620 Td (GAMMA) Tj ET',
    'q 1 0 0 1 72 600 cm /Fm0 Do Q',
  ].join('\n');

  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R' +
      '/Resources<</Font<</F1 6 0 R>>/XObject<</Fm0 5 0 R>>>>>>',
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    // /Fm0's Resources name the page's own XObject dict, so a walker that
    // recurses through resources instead of following `Do` re-enters itself.
    `<</Type/XObject/Subtype/Form/BBox[0 0 60 20]/Resources<</Font<</F1 6 0 R>>` +
      `/XObject<</Fm0 5 0 R>>>>/Length ${stamp.length}>>\nstream\n${stamp}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];

  let body = '%PDF-1.4\n';
  for (let i = 0; i < objects.length; i++) body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  body += 'trailer<</Root 1 0 R>>\n%%EOF\n';
  return Buffer.from(body, 'latin1');
}
