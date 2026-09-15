// Answer the two pending slice audits (pages 23 and pages 19-22) from what the rendered pages
// and the PDF metadata show, then fetch the next pending request.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const run = fs.readFileSync(path.join(here, 'run.txt'), 'utf8').trim();
const pending = JSON.parse(fs.readFileSync(path.join(here, 'req-2.json'), 'utf8')).structuredContent.pendingRequests;
const byImages = Object.fromEntries(pending.map((p) => [p.imageCount, p.requestId]));
if (!byImages[1] || !byImages[4]) throw new Error('expected one 1-image and one 4-image request, got ' + JSON.stringify(pending.map((p) => p.imageCount)));

const common = {
  pageCount: 54, hasSearchableText: true, hasImages: true, hasTables: false, hasForms: false, documentLanguage: 'en',
};
const sharedPasses = [
  'LANGUAGE: the PDF declares en as its document language and the visible text is English.',
  'METADATA: the document metadata carries the title Report on the Condition of Education 2023, the author NCES and the subject The Condition of Education 2023.',
  'TEXT: the pages are born-digital with a searchable text layer; no scanned image-only pages.',
  'FORMS: these pages contain no form fields.',
  'TABLES: these pages contain no data tables; the numeric content is carried in captioned figures and prose.',
];

const page23 = {
  score: 95,
  confidence: 'medium',
  summary: 'Page 23 is a tagged, born-digital page with a matching H3 heading, a captioned and tagged figure, tagged bullet lists, descriptive cross-reference links and dark body text on white, with the one concern being the pale green Fall 2021 bars and legend swatch in Figure 5, which sit near 1.8:1 against the white plot area.',
  critical: [],
  serious: [],
  moderate: [
    { ruleId: 'nontext-contrast', claimKind: 'quality', issue: 'Pages 23–23: the light green Fall 2021 bars and their legend swatch in Figure 5 sit at roughly 1.8:1 against the white plot area, below the 3:1 needed for graphical objects that convey information, although each bar also carries its printed value.', wcag: '1.4.11', count: 1, location: 'Figure 5. Percentage distribution of student enrollment in public elementary' },
  ],
  minor: [],
  passes: [
    'STRUCTURE: the visible section title Racial/Ethnic Enrollment in Public and Private Schools matches a tagged H3 under the chapter H2, the running header and page footer are outside the main flow, and the two-column prose reads column by column.',
    'IMAGES: Figure 5 is a tagged Figure with a visible caption, footnotes and source line, and the tag tree reports alt text present on all 30 figures with none missing; the wording of the alt text cannot be judged from the render.',
    'CONTRAST: body text is dark grey on white and the slate section heading and bold figure caption exceed 4.5:1.',
    'LINKS: the cross-reference links Racial/Ethnic Enrollment in Public Schools and Characteristics of Elementary and Secondary Schools use the indicator names as link text.',
    'LISTS: the two bulleted lists of percentage changes are tagged lists (L, LI, Lbl and LBody roles are present in the tag tree).',
  ].concat(sharedPasses),
  ...common,
};

const pages19to22 = {
  score: 95,
  confidence: 'medium',
  summary: 'Pages 19 through 22 open the chapter with a tagged H2 title, a Key Findings panel of tagged bullet lists, matching H3 section headings, three captioned and tagged figures, descriptive cross-reference links and strong body-text contrast, with the one concern being the pale mint data lines for Grades 9 through 12 in Figure 3 and Public charter in Figure 4, which sit near 1.6:1 against the white plot area.',
  critical: [],
  serious: [],
  moderate: [
    { ruleId: 'nontext-contrast', claimKind: 'quality', issue: 'Pages 19–22: the pale mint data lines for Grades 9 through 12 in Figure 3 and Public charter in Figure 4 sit at roughly 1.6:1 against the white plot area, below the 3:1 needed for graphical objects that convey information, although both lines are labelled directly and the Figure 4 line also carries diamond markers.', wcag: '1.4.11', count: 2, location: 'Figure 3. Enrollment in public elementary and secondary schools, by level' },
  ],
  minor: [],
  passes: [
    'STRUCTURE: the chapter title Preprimary, Elementary, and Secondary Education is a tagged H2 and the visible section titles Preprimary Education and Elementary and Secondary Education and School Choice match tagged H3 entries in sequence; the running header and page footers sit outside the main flow and the two-column prose reads column by column.',
    'IMAGES: Figures 2, 3 and 4 are tagged Figures with visible captions, notes and source lines, and the tag tree reports alt text present on all 30 figures with none missing; the wording of the alt text cannot be judged from the renders.',
    'CONTRAST: body text is dark grey on white, the Key Findings panel is dark text on a pale beige background, and the brown chapter title and slate section headings exceed 4.5:1; the solid and dashed dark green series in Figures 2, 3 and 4 exceed 3:1.',
    'LINKS: the cross-reference links Enrollment Rates of Young Children, Public School Enrollment, Characteristics of Elementary and Secondary Schools, Public Charter School Enrollment and Private School Enrollment use the indicator names as link text.',
    'LISTS: the Key Findings bullets on page 19 and the enrollment-change bullets on page 20 are tagged lists (L, LI, Lbl and LBody roles are present in the tag tree), and footnotes 18 to 20 are tagged Note and Reference elements.',
  ].concat(sharedPasses),
  ...common,
};

const responses = [
  { request_id: byImages[1], text: JSON.stringify(page23) },
  { request_id: byImages[4], text: JSON.stringify(pages19to22) },
];
fs.writeFileSync(path.join(here, 'batch-1.json'), JSON.stringify({ run_id: run, wait_seconds: 25, responses }));
execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', 'remediation_agent_respond_batch', '@' + path.join(here, 'batch-1.json'), '--out', path.join(here, 'req-3.json'), '--images', path.join(here, 'img'), '--prefix', 'r3', '--max', '200'], { stdio: 'ignore' });
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), path.join(here, 'req-3.json'), '--tail=14'], { encoding: 'utf8' }));
