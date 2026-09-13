// Baseline HTML audits for the Form 1040 accessible version (sections 1-4), sent to the pending
// requests, then the pipeline's next request is shown.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const run = fs.readFileSync(path.join(here, 'run-f1040.txt'), 'utf8').trim();
const P = 'mreq-9faaa41a-7dac-413f-985b-95c2235562ca-';
const common = [
  '4. LANDMARKS: all content sits inside the main landmark (header noted as missing).',
  '5. IMAGES: no img elements are present.',
  '7. CONTRAST: text is #000000 or #1e293b on #ffffff and on the pale #e6f8f8 table header tint, above 12:1.',
  '8. LINKS: the only link is the skip link, whose text describes its target; the IRS web addresses are printed as plain text as in the source.',
  '11. FORMS: no input elements are present; the source checkboxes are rendered as ☐ characters (noted for review).',
];
const regionIssue = { ruleId: 'region-landmarks', claimKind: 'absence', issue: 'No header or navigation landmark accompanies the main landmark.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'document' };
const s1 = { score: 88, summary: 'The document declares English, has a descriptive title, a skip link and a main landmark, and its section headings mirror the tagged Filing Status through Paid Preparer sections, with the remaining issues being a duplicated banner h1, the absence of a header landmark, and checkboxes rendered as static characters.', issues: [
  { ruleId: 'heading-multiple', claimKind: 'structure', issue: 'The page contains two h1 elements with the same text, one inside the styled banner and one immediately after it.', wcag: '1.3.1', severity: 'minor', count: 1, location: 'Form 1040: U.S. Individual Income Tax Return, 2025' },
  { ruleId: 'region-landmarks', claimKind: 'absence', issue: 'The opening banner is a plain div and no header or navigation landmark is present.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'document' },
  { ruleId: 'other', claimKind: 'quality', issue: 'The checkboxes of the source form are rendered as static box characters inside list items and table cells, so the accessible version describes the form but cannot be completed; whether a fillable version is required needs a manual decision.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'Check only one box.' },
], passes: ['1. LANGUAGE: the html element declares lang="en".', '2. TITLE: the title element reads Accessible Document — irs-f1040.', '3. HEADINGS: an h1 is followed by h2 sections and one h3 (Presidential Election Campaign) under an h2, with no skipped level (the duplicate banner h1 is noted above).', '6. TABLES: the tables in this section carry captions and th scope="col" headers.', '9. LISTS: identification fields and filing-status options use ul with li children.', '10. SKIP NAV: a Skip to main content link is the first focusable element.'].concat(common) };
const s2 = { score: 85, summary: 'This section keeps the tagged section outline, gives the Dependents and Income tables captions and scoped column headers, and uses semantic lists for the form options, with the remaining issues being the row labels of those two tables marked as data cells and the document-wide missing header landmark.', issues: [
  { ruleId: 'table-header', claimKind: 'structure', issue: 'In the Dependents table the first column holds the item labels (1) First name through (7) Credits, and in the Income table the first column holds the line numbers 1a through 11a; both identify their rows but are td elements rather than row headers with scope="row".', wcag: '1.3.1', severity: 'serious', count: 2, location: '(1) First name' },
  regionIssue,
], passes: ['3. HEADINGS: Filing Status, Digital Assets, Dependents and Income are h2 headings under the h1, with no skipped level.', '6. TABLES: the Dependents and Income tables have captions, thead rows and th scope="col" headers (row headers noted above).', '9. LISTS: filing-status options use ul with li children; no bullet characters stand in for list markup.'].concat(common) };
const s3 = { score: 88, summary: 'This section continues the Income table and presents the Tax and Credits lines as a captioned table with scoped column headers under the tagged section heading, with the remaining issues being line-number cells that are data cells rather than row headers and the document-wide missing header landmark.', issues: [
  { ruleId: 'table-header', claimKind: 'structure', issue: 'In the Income and Tax and Credits tables the first column holds the line numbers, such as 11b and 12e, that identify each row, but those cells are td elements rather than row headers with scope="row".', wcag: '1.3.1', severity: 'serious', count: 2, location: 'Standard deduction or itemized deductions (from Schedule A)' },
  regionIssue,
], passes: ['3. HEADINGS: Tax and Credits is an h2 under the h1, with no skipped level.', '6. TABLES: the Income and Tax and Credits tables carry captions and th scope="col" headers (row headers noted above).', '9. LISTS: no bullet characters are used as list markers in this section.'].concat(common) };
const s4 = { score: 85, summary: 'This closing section presents the Payments, Refund and Amount You Owe lines as captioned tables with scoped column headers, keeps the tagged h2 outline through Paid Preparer Use Only, and ends with a contentinfo footer, with the remaining issues being line-number cells marked as data cells rather than row headers and the absence of a header landmark for the banner.', issues: [
  { ruleId: 'table-header', claimKind: 'structure', issue: 'In the Payments and Refundable Credits, Refund and Amount You Owe tables the first column holds the line numbers that identify each row, but those cells are td elements rather than row headers with scope="row".', wcag: '1.3.1', severity: 'serious', count: 3, location: 'Add lines 25a through 25c' },
  { ruleId: 'region-landmarks', claimKind: 'absence', issue: 'A footer landmark closes the document but no header or navigation landmark exists for the opening banner.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'document' },
], passes: ['3. HEADINGS: Payments and Refundable Credits, Refund, Amount You Owe, Third Party Designee, Sign Here and Paid Preparer Use Only are h2 headings with no skipped level.', '4. LANDMARKS: the main landmark closes after the preparer block and a footer with role="contentinfo" follows it.', '6. TABLES: the three tables carry captions and th scope="col" headers (row headers noted above).', '9. LISTS: designee, signature and preparer fields use ul with li children.'].concat(common.slice(1)) };
const bySection = { 1: s1, 2: s2, 3: s3, 4: s4 };

const call = (tool, args, out) => { fs.writeFileSync(path.join(here, 'f1040-args.json'), JSON.stringify(args)); execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', tool, '@' + path.join(here, 'f1040-args.json'), '--out', out, '--max', '200'], { stdio: 'ignore' }); return JSON.parse(fs.readFileSync(out, 'utf8')); };
const out = path.join(here, 'f1040-state.json');
let state = JSON.parse(fs.readFileSync(out, 'utf8'));
for (let round = 0; round < 6; round++) {
  const pending = state.structuredContent.pendingRequests || [];
  const responses = [];
  for (const q of pending) { const m = /HTML section (\d)\/4:/.exec(q.prompt); if (m && bySection[m[1]]) responses.push({ request_id: q.requestId, text: JSON.stringify(bySection[m[1]]) }); }
  console.log('round', round, 'status', state.structuredContent.status, 'calls', state.structuredContent.modelCallsSoFar, 'pending', pending.length, 'auditReplies', responses.length);
  if (responses.length) state = call('remediation_agent_respond_batch', { run_id: run, wait_seconds: 28, responses }, out);
  else if (pending.length) break;
  else state = call('remediation_agent_requests', { run_id: run, wait_seconds: 28 }, out);
  if (state.structuredContent.status !== 'running') break;
}
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), out, '--tail=8'], { encoding: 'utf8' }).split('\n').slice(0, 30).join('\n'));
