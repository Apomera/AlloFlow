// Answer every pending vision audit of the ED parent-guide run with the same honest audit of the
// two rendered pages (an OSEP "Dear Colleagues" letter, tagged, no headings), then poll.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const run = fs.readFileSync(path.join(here, 'run-edg.txt'), 'utf8').trim();
const state = JSON.parse(fs.readFileSync(path.join(here, process.argv[2] || 'edg-req-1.json'), 'utf8'));
const pending = state.structuredContent.pendingRequests || [];
const audit = {
  score: 90,
  confidence: 'high',
  summary: 'A clean two-page tagged letter with searchable text, a described banner image, readable black-on-white text and working citation links, whose one structural gap is that it carries no headings at all.',
  critical: [],
  serious: [
    { ruleId: 'heading-root', claimKind: 'absence', issue: 'The tag tree contains no heading elements, so the letter has no h1 and no heading outline for a screen reader user to navigate by.', wcag: '1.3.1', count: 1, location: 'document' },
  ],
  moderate: [],
  minor: [],
  passes: [
    '1. STRUCTURE: the tag tree has a logical reading order of paragraphs, two sections, a note and links, and the visual layout is a single column (headings noted above).',
    '2. IMAGES: the single figure, the OSEP banner, carries alternative text in the tag tree.',
    '3. TABLES: the document contains no data tables.',
    '4. CONTRAST: body text is black on white and the banner text is white on dark navy, both far above 4.5:1; link text is blue on white above 4.5:1.',
    '5. FORMS: the document contains no form fields.',
    '6. LANGUAGE: the text is English throughout; the language tag itself is not visible in the rendering and the tag tree summary did not flag it.',
    '7. LINKS: the seven links are footnote citations and email addresses whose visible text is the destination itself, which identifies the target.',
    '8. LISTS: the letter has no list-like content set as plain text.',
    '9. TEXT: the PDF is born-digital and tagged, with a searchable text layer on both pages.',
    '10. METADATA: not verifiable from the rendered pages; no evidence of a missing title was available.',
  ],
  pageCount: 2,
  hasSearchableText: true,
  hasImages: true,
  hasTables: false,
  hasForms: false,
  documentLanguage: 'en',
};
const responses = pending.filter((q) => q.kind === 'vision').map((q) => ({ request_id: q.requestId, text: JSON.stringify(audit) }));
if (!responses.length) { console.log('no pending vision requests'); process.exit(0); }
const args = { run_id: run, wait_seconds: 28, responses };
fs.writeFileSync(path.join(here, 'edg-args.json'), JSON.stringify(args));
const out = path.join(here, process.argv[3] || 'edg-req-2.json');
execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', 'remediation_agent_respond_batch', '@' + path.join(here, 'edg-args.json'), '--out', out, '--images', path.join(here, 'edg-images'), '--prefix', 'e2', '--max', '200'], { stdio: 'ignore' });
console.log('answered', responses.map((r) => r.request_id.slice(-4)).join(','), 'satisfiedCalls', pending.map((q) => q.satisfiedCalls));
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), out, '--tail=8'], { encoding: 'utf8' }).split('\n').slice(0, 40).join('\n'));
