// Compose the NCES (pages 19-23) PDF audit from what the five renders and the tag tree show,
// with the title/author findings decided by the PDF's own metadata, then answer all three
// pending auditor requests and fetch the next request.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const PDF = require(path.join(root, 'desktop/mcp/vendor/pdf-lib.min.js'));
(async () => {
  const doc = await PDF.PDFDocument.load(fs.readFileSync(path.join(root, 'mcp-testing/corpus/tables/nces-condition-of-education.pdf')), { ignoreEncryption: true, updateMetadata: false });
  const nm = PDF.PDFName.of;
  const meta = { title: doc.getTitle() || null, author: doc.getAuthor() || null, subject: doc.getSubject() || null, lang: String(doc.catalog.get(nm('Lang')) || ''), tagged: !!doc.catalog.get(nm('StructTreeRoot')) };
  console.log('metadata', JSON.stringify(meta));
  const critical = [], serious = [], minor = [];
  if (!meta.title) critical.push({ ruleId: 'document-title', claimKind: 'absence', issue: 'The document metadata carries no title although the tag tree names the report.', wcag: '2.4.2', count: 1, location: 'document' });
  if (!/^\(?en/i.test(meta.lang.replace(/[()]/g, ''))) critical.push({ ruleId: 'document-language', claimKind: 'absence', issue: 'No document language is declared for this English report.', wcag: '3.1.1', count: 1, location: 'document' });
  if (!meta.author || !meta.subject) minor.push({ ruleId: 'document-metadata', claimKind: 'absence', issue: 'The document metadata is missing ' + [!meta.author && 'an author', !meta.subject && 'a subject'].filter(Boolean).join(' and ') + '.', wcag: '2.4.2', count: 1, location: 'document' });
  const reply = {
    score: 100 - critical.length * 15 - serious.length * 10 - 5 - minor.length * 2,
    confidence: 'medium',
    summary: 'These five pages come from a tagged report with a clean H1/H2/H3 outline, tagged lists and footnotes, descriptive hyperlinks, alt text recorded on every figure and strong body-text contrast, with the remaining concern being the light green data lines in the line charts, which sit near 2:1 against the white plot area, and alt-text quality that cannot be judged from the renders.',
    critical, serious,
    moderate: [
      { ruleId: 'nontext-contrast', claimKind: 'quality', issue: 'The palest green series line in the line charts, the Grades 9 through 12 line in Figure 3 and the Public charter line in Figure 4, and the light dashed 3- to 4-year-olds line in Figure 2, sit at roughly 2:1 against the white plot area and the grey gridlines, below the 3:1 needed for graphical objects that convey information.', wcag: '1.4.11', count: 3, location: 'Figure 3. Enrollment in public elementary and secondary schools, by level' },
    ],
    minor,
    passes: [
      'STRUCTURE: the tag tree carries H1, 14 H2 and 27 H3 headings in a sequential outline, and the visible section titles on these pages (Preprimary, Elementary, and Secondary Education; Preprimary Education; Elementary and Secondary Education and School Choice; Racial/Ethnic Enrollment in Public and Private Schools) match tagged H2/H3 entries.',
      'IMAGES: the tag tree reports alt text present on all 30 Figure elements and none missing; Figures 2 through 5 on these pages are tagged figures with visible captions, notes and sources (alt-text wording could not be inspected from the renders).',
      'TABLES: no data tables appear on pages 19 through 23; the numeric content is in captioned charts and prose.',
      'CONTRAST: body text is dark grey on white, the Key Findings box is dark text on a pale beige panel, and the brown chapter title and slate section headings all exceed 4.5:1.',
      'FORMS: the document contains no form fields.',
      'LANGUAGE: the PDF declares ' + (meta.lang || 'no') + ' as its document language.',
      'LINKS: cross-reference links such as Enrollment Rates of Young Children, Public School Enrollment and Public Charter School Enrollment use the indicator names as link text, and the tag tree carries 108 Link elements.',
      'LISTS: the Key Findings bullets and the racial/ethnic change bullets are tagged lists (L, LI, Lbl, LBody roles present).',
      'TEXT: the pages are born-digital with a searchable text layer; no scanned pages.',
      'METADATA: ' + (meta.title ? 'a document title, ' + meta.title + ', is present' : 'no title') + (meta.author ? '; author present' : '') + (meta.subject ? '; subject present' : '') + '.',
    ],
    pageCount: 5, hasSearchableText: true, hasImages: true, hasTables: false, hasForms: false, documentLanguage: 'en',
  };
  const text = JSON.stringify(reply);
  const prev = JSON.parse(fs.readFileSync(path.join(here, 'nces-req-1.json'), 'utf8'));
  const responses = prev.structuredContent.pendingRequests.map((r) => ({ request_id: r.requestId, text }));
  const run = fs.readFileSync(path.join(here, 'run-nces.txt'), 'utf8').trim();
  fs.writeFileSync(path.join(here, 'nces-batch-1.json'), JSON.stringify({ run_id: run, wait_seconds: 25, responses }));
  console.log('score', reply.score, 'responses', responses.length);
  execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', 'remediation_agent_respond_batch', '@' + path.join(here, 'nces-batch-1.json'), '--out', path.join(here, 'nces-req-2.json'), '--images', path.join(here, 'img-nces'), '--prefix', 'n2', '--max', '200'], { stdio: 'ignore' });
  console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), path.join(here, 'nces-req-2.json'), '--tail=6'], { encoding: 'utf8' }).split('\n').slice(0, 16).join('\n'));
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
