// Compose the Form 1040 (2025) PDF audit from the two renders and the tag tree, decide the
// title/author/language findings from the PDF's own metadata, answer every pending auditor
// request with it, and show what the pipeline asks next.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const PDF = require(path.join(root, 'desktop/mcp/vendor/pdf-lib.min.js'));
(async () => {
  const doc = await PDF.PDFDocument.load(fs.readFileSync(path.join(root, 'mcp-testing/corpus/forms/irs-f1040.pdf')), { ignoreEncryption: true, updateMetadata: false });
  const nm = PDF.PDFName.of;
  const meta = { title: doc.getTitle() || null, author: doc.getAuthor() || null, subject: doc.getSubject() || null, lang: String(doc.catalog.get(nm('Lang')) || '').replace(/[()]/g, ''), tagged: !!doc.catalog.get(nm('StructTreeRoot')) };
  console.log('metadata', JSON.stringify(meta));
  const critical = [], serious = [], moderate = [], minor = [];
  if (!meta.lang) critical.push({ ruleId: 'document-language', claimKind: 'absence', issue: 'The document declares no language although every label and instruction is English, so screen readers cannot select pronunciation rules for the form.', wcag: '3.1.1', count: 1, location: 'document' });
  if (!meta.title) critical.push({ ruleId: 'document-title', claimKind: 'absence', issue: 'The document metadata carries no title although the form names itself on page 1.', wcag: '2.4.2', count: 1, location: 'document' });
  serious.push({ ruleId: 'heading-order', claimKind: 'structure', issue: 'The tag tree places the H3 Presidential Election Campaign directly under the H1 group before any H2, so the outline skips from level 1 to level 3.', wcag: '1.3.1', count: 1, location: 'Presidential Election Campaign' });
  serious.push({ ruleId: 'text-contrast', claimKind: 'quality', issue: 'The light grey placeholder text MM / DD / YYYY in the Deceased and Spouse date fields sits at roughly 1.8:1 against the white field, below 4.5:1.', wcag: '1.4.3', count: 2, location: 'Deceased MM / DD / YYYY' });
  moderate.push({ ruleId: 'other', claimKind: 'quality', issue: 'The 199 tagged form fields, including every Filing Status, Dependents and Refund checkbox, cannot be confirmed from the renders to carry accessible names that state the option they select; the printed labels sit beside the boxes rather than inside the field tags, so the field names need a manual check.', wcag: '1.3.1', count: 1, location: 'Filing Status' });
  minor.push({ ruleId: 'heading-multiple', claimKind: 'structure', issue: 'The tag tree contains three H1 elements, Form, 1040 and U.S. Individual Income Tax Return, splitting the single form title into three top-level headings.', wcag: '1.3.1', count: 1, location: 'U.S. Individual Income Tax Return' });
  if (!meta.author || !meta.subject) minor.push({ ruleId: 'document-metadata', claimKind: 'absence', issue: 'The document metadata is missing ' + [!meta.author && 'an author', !meta.subject && 'a subject'].filter(Boolean).join(' and ') + '.', wcag: '2.4.2', count: 1, location: 'document' });
  const score = Math.max(0, 100 - critical.length * 15 - serious.length * 10 - moderate.length * 5 - minor.length * 2);
  const reply = {
    score, confidence: 'medium',
    summary: 'The form is tagged with section headings for Filing Status through Paid Preparer Use Only, a header-row table for the four dependents, tagged form fields and a searchable text layer, and its remaining issues are a missing document language, an H3 that precedes the first H2, three H1 fragments for the title, low-contrast date placeholders, and field accessible names that need a manual check.',
    critical, serious, moderate, minor,
    passes: [
      'STRUCTURE: the tag tree carries H1/H2/H3 headings matching the visible section labels (Filing Status, Digital Assets, Dependents, Income, Tax and Credits, Payments and Refundable Credits, Refund, Amount You Owe, Third Party Designee, Sign Here, Paid Preparer Use Only) and Sect/Part containers.',
      'IMAGES: the form contains no images, so no alternative text is missing.',
      'TABLES: the Dependents grid is tagged as a table with four TH column headers (Dependent 1 through Dependent 4) and TR/TD rows.',
      'CONTRAST: black label text on the white and pale cyan field areas exceeds 4.5:1 throughout; only the grey date placeholders fall short.',
      'FORMS: 199 Form elements are tagged, so the fields are exposed as fields rather than flat text (names are the manual-check item above).',
      'LINKS: www.irs.gov/Payments and www.irs.gov/Form1040 are printed as full addresses that describe their destination.',
      'LISTS: the Standard deduction sidebar bullets are tagged as a list (LI/LBody present).',
      'TEXT: the pages are born-digital with a searchable text layer.',
      'METADATA: ' + (meta.title ? 'a title, ' + meta.title + ', is present' : 'no title is present') + (meta.author ? '; author present' : '') + (meta.subject ? '; subject present' : '') + '.',
    ],
    pageCount: 2, hasSearchableText: true, hasImages: false, hasTables: true, hasForms: true, documentLanguage: 'en',
  };
  const text = JSON.stringify(reply);
  const run = fs.readFileSync(path.join(here, 'run-f1040.txt'), 'utf8').trim();
  let state = JSON.parse(fs.readFileSync(path.join(here, 'f1040-req-1.json'), 'utf8'));
  for (let round = 0; round < 6; round++) {
    const pending = state.structuredContent.pendingRequests || [];
    const responses = pending.filter((q) => /accessibility auditor for educational documents/.test(q.prompt)).map((q) => ({ request_id: q.requestId, text }));
    console.log('round', round, 'status', state.structuredContent.status, 'calls', state.structuredContent.modelCallsSoFar, 'pending', pending.length, 'auditReplies', responses.length);
    const args = responses.length ? { tool: 'remediation_agent_respond_batch', a: { run_id: run, wait_seconds: 25, responses } } : { tool: 'remediation_agent_requests', a: { run_id: run, wait_seconds: 25 } };
    fs.writeFileSync(path.join(here, 'f1040-args.json'), JSON.stringify(args.a));
    execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', args.tool, '@' + path.join(here, 'f1040-args.json'), '--out', path.join(here, 'f1040-state.json'), '--images', path.join(here, 'img-f1040'), '--prefix', 'f' + (round + 2), '--max', '200'], { stdio: 'ignore' });
    state = JSON.parse(fs.readFileSync(path.join(here, 'f1040-state.json'), 'utf8'));
    const next = state.structuredContent.pendingRequests || [];
    if (next.length && !next.some((q) => /accessibility auditor for educational documents/.test(q.prompt))) break;
    if (state.structuredContent.status !== 'running') break;
  }
  console.log('score sent', score);
  console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), path.join(here, 'f1040-state.json'), '--tail=6', '--full'], { encoding: 'utf8' }).split('\n').slice(0, 40).join('\n'));
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
