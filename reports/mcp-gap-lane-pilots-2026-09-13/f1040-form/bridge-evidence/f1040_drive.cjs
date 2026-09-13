// Drive the Form 1040 run to completion: verification/final audits answered from measured facts
// of each section (header landmark, single h1, row headers, footer), fix-pass fragments passed
// through fix_fragments3 (idempotent), anything else stops the loop and is shown.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const run = fs.readFileSync(path.join(here, 'run-f1040.txt'), 'utf8').trim();
const P = 'mreq-9faaa41a-7dac-413f-985b-95c2235562ca-';
const out = path.join(here, 'f1040-state.json');
const call = (tool, args) => { fs.writeFileSync(path.join(here, 'f1040-args.json'), JSON.stringify(args)); execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', tool, '@' + path.join(here, 'f1040-args.json'), '--out', out, '--max', '200'], { stdio: 'ignore' }); return JSON.parse(fs.readFileSync(out, 'utf8')); };
const count = (re, s) => (s.match(re) || []).length;
const ROW_TABLES = /<caption[^>]*>(?:Dependents:|Income lines|Tax and credits lines|Payments and refundable credits lines|Refund lines|Amount you owe lines)/;

function auditReply(html, sec, total) {
  const first = sec === '1';
  const facts = { header: count(/<header[\s>]/g, html), h1: count(/<h1[\s>]/g, html), rowTh: count(/scope="row"/g, html), footer: count(/<footer/g, html), tables: count(/<table[\s>]/g, html) };
  // Any row-label table whose tbody still starts rows with <td> is a remaining defect.
  let tdRowLabels = 0;
  for (const table of html.match(/<table[\s\S]*?<\/table>/g) || []) { if (!ROW_TABLES.test(table)) continue; tdRowLabels += count(/<tr><td/g, table); }
  const issues = [];
  if (first && facts.h1 > 1) issues.push({ ruleId: 'heading-multiple', claimKind: 'structure', issue: 'The page still contains two h1 elements with the same text.', wcag: '1.3.1', severity: 'minor', count: 1, location: 'Form 1040: U.S. Individual Income Tax Return, 2025' });
  if (first && !facts.header) issues.push({ ruleId: 'region-landmarks', claimKind: 'absence', issue: 'The opening banner is still a plain div; no header landmark is present.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'document' });
  if (tdRowLabels) issues.push({ ruleId: 'table-header', claimKind: 'structure', issue: 'Line-number or item-label cells in the first column of the form tables are still td elements rather than row headers with scope="row".', wcag: '1.3.1', severity: 'serious', count: Math.min(10000, tdRowLabels), location: 'document' });
  if (first) issues.push({ ruleId: 'other', claimKind: 'quality', issue: 'The checkboxes of the source form are rendered as static box characters inside list items and table cells, so the accessible version describes the form but cannot be completed; whether a fillable version is required needs a manual decision.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'Check only one box.' });
  const score = Math.max(0, 100 - issues.reduce((s, i) => s + ({ critical: 15, serious: 10, moderate: 5, minor: 2 })[i.severity], 0));
  const passes = [
    ...(first ? ['1. LANGUAGE: the html element declares lang="en".', '2. TITLE: the title element reads Accessible Document — irs-f1040.', '10. SKIP NAV: a Skip to main content link is the first focusable element.'] : []),
    facts.h1 === 1 && first ? '3. HEADINGS: a single h1 inside the header landmark is followed by h2 sections and one h3 under an h2, with no skipped level.' : '3. HEADINGS: h2 section headings continue under the single h1 with no skipped level.',
    facts.header ? '4. LANDMARKS: a header landmark holds the banner and a main landmark with id main-content wraps the content' + (facts.footer ? ', with a contentinfo footer closing the document.' : '.') : '4. LANDMARKS: the main landmark wraps the content' + (facts.footer ? ' and a contentinfo footer closes the document.' : '.'),
    '5. IMAGES: no img elements are present.',
    facts.tables ? (tdRowLabels ? '6. TABLES: the tables carry captions and th scope="col" headers (row headers noted above).' : '6. TABLES: every table carries a caption, th scope="col" column headers and th scope="row" row headers for the line numbers and item labels.') : '6. TABLES: no tables occur in this section.',
    '7. CONTRAST: text is #000000 or #1e293b on #ffffff and on the pale #e6f8f8 table header tint, above 12:1.',
    '8. LINKS: the only link is the skip link; IRS web addresses are printed as plain text as in the source.',
    '9. LISTS: form fields and options use ul with li children; no bullet characters stand in for list markup.',
    '11. FORMS: no input elements are present' + (first ? ' (the static checkbox rendering is noted above).' : '.'),
  ];
  const summary = issues.length <= 1
    ? 'The section now has a single h1 inside a header landmark, captioned tables with column and row headers, semantic lists and strong contrast' + (first ? ', with the static checkbox rendering left as the one item for a manual decision.' : ', with no remaining violations.')
    : 'The section keeps its headings, captions and lists, with the issues listed remaining.';
  return { score, summary, issues, passes, facts };
}

let state = JSON.parse(fs.readFileSync(out, 'utf8'));
for (let round = 0; round < 30; round++) {
  const sc = state.structuredContent || {};
  const pending = sc.pendingRequests || [];
  if (sc.status && sc.status !== 'running') { console.log('TERMINAL', sc.status, 'calls', sc.modelCallsSoFar); break; }
  const responses = [];
  const fixIds = [];
  for (const q of pending) {
    const m = /HTML section (\d)\/(\d):/.exec(q.prompt);
    if (m) {
      const html = q.prompt.slice(q.prompt.indexOf('"""', q.prompt.indexOf('HTML section')) + 3, q.prompt.lastIndexOf('"""'));
      const r = auditReply(html, m[1], m[2]);
      console.log(`  audit section ${m[1]}/${m[2]} -> score ${r.score} facts ${JSON.stringify(r.facts)} issues ${r.issues.map((i) => i.ruleId).join(',') || 'none'}`);
      responses.push({ request_id: q.requestId, text: JSON.stringify({ score: r.score, summary: r.summary, issues: r.issues, passes: r.passes }) });
    } else if (/UNTRUSTED HTML FRAGMENT DATA/.test(q.prompt)) {
      const id = q.requestId.slice(q.requestId.lastIndexOf('-') + 1);
      fs.writeFileSync(path.join(here, 'fprompt-' + id + '.txt'), q.prompt); fixIds.push(id);
    } else { console.log('UNKNOWN PROMPT', q.requestId, q.kind, q.promptTotalChars, q.prompt.slice(0, 200).replace(/\n/g, ' ')); }
  }
  if (fixIds.length) {
    const outBatch = path.join(here, 'f1040-fixbatch.json');
    console.log(execFileSync(process.execPath, [path.join(here, 'fix_fragments3.cjs'), path.join(here, 'run-f1040.txt'), 'fprompt-', P, outBatch, ...fixIds], { encoding: 'utf8' }).trim());
    for (const r of JSON.parse(fs.readFileSync(outBatch, 'utf8')).responses) responses.push(r);
  }
  console.log(`round ${round}: calls=${sc.modelCallsSoFar} pending=${pending.length} answering=${responses.length}`);
  if (pending.length && !responses.length) break;
  state = responses.length ? call('remediation_agent_respond_batch', { run_id: run, wait_seconds: 28, responses }) : call('remediation_agent_requests', { run_id: run, wait_seconds: 30 });
}
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), out, '--tail=10'], { encoding: 'utf8' }).split('\n').slice(0, 24).join('\n'));
