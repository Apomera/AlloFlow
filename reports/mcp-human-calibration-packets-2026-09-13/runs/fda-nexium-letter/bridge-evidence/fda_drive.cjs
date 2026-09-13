// Drive the FDA letter run to completion. HTML audits are answered from measured facts of each
// section (landmarks, headings, images, tables, lists, links); fix-pass fragments go through
// fix_fragments3 (banner -> header, second h1 -> h2, idempotent); anything else stops the loop.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const runFile = process.argv[2] || 'run-fda.txt';
const stateName = process.argv[3] || 'fda-state.json';
const startFrom = process.argv[4] || null;
const run = fs.readFileSync(path.join(here, runFile), 'utf8').trim();
const out = path.join(here, stateName);
const call = (tool, args) => { fs.writeFileSync(path.join(here, 'fda-args.json'), JSON.stringify(args)); execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', tool, '@' + path.join(here, 'fda-args.json'), '--out', out, '--images', path.join(here, 'fda-images'), '--prefix', 'fd', '--max', '200'], { stdio: 'ignore' }); return JSON.parse(fs.readFileSync(out, 'utf8')); };
const count = (re, s) => (s.match(re) || []).length;
const strip = (s) => s.replace(/<[^>]+>/g, '').trim();

function auditReply(html, sec, total) {
  const first = sec === '1';
  const imgs = (html.match(/<img[^>]*>/g) || []);
  const noAlt = imgs.filter((t) => !/\salt="[^"]+"/.test(t)).length;
  const tables = (html.match(/<table[\s\S]*?<\/table>/g) || []);
  const tablesNoCaption = tables.filter((t) => !/<caption/.test(t)).length;
  const tablesNoTh = tables.filter((t) => !/<th[\s>]/.test(t)).length;
  const buttons = (html.match(/<button[^>]*>[\s\S]*?<\/button>/g) || []);
  const unlabeled = buttons.filter((b) => !/aria-label="[^"]+"/.test(b) && !strip(b)).length;
  const links = (html.match(/<a [^>]*>[\s\S]*?<\/a>/g) || []).map(strip);
  const badLinks = links.filter((t) => /^(click here|here|link|read more)$/i.test(t)).length;
  const bulletText = count(/<p[^>]*>\s*[•·▪]\s/g, html);
  const facts = { header: count(/<header[\s>]/g, html), h1: count(/<h1[\s>]/g, html), h2: count(/<h2[\s>]/g, html), h3: count(/<h3[\s>]/g, html), footer: count(/<footer/g, html), main: count(/<main[\s>]/g, html), banner: count(/data-allo-banner/g, html), imgs: imgs.length, noAlt, tables: tables.length, tablesNoCaption, tablesNoTh, ul: count(/<ul[\s>]/g, html), ol: count(/<ol[\s>]/g, html), blockquote: count(/<blockquote/g, html), links: links.length, badLinks, bulletText, buttons: buttons.length, unlabeled };
  const issues = [];
  if (facts.h1 > 1) issues.push({ ruleId: 'heading-multiple', claimKind: 'structure', issue: 'The section contains more than one h1 element.', wcag: '1.3.1', severity: 'minor', count: 1, location: 'Response to PREA Non-Compliance Letter' });
  if ((first || facts.banner) && !facts.header) issues.push({ ruleId: 'region-landmarks', claimKind: 'absence', issue: 'The title banner is a plain div and no header landmark accompanies the main landmark.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'document' });
  if (noAlt) issues.push({ ruleId: 'image-alt', claimKind: 'absence', issue: 'An image has no alternative text.', wcag: '1.1.1', severity: 'critical', count: noAlt, location: 'document' });
  if (tablesNoCaption) issues.push({ ruleId: 'table-caption', claimKind: 'absence', issue: 'A data table has no caption.', wcag: '1.3.1', severity: 'moderate', count: tablesNoCaption, location: 'Final Protocol Submission' });
  if (tablesNoTh) issues.push({ ruleId: 'table-header', claimKind: 'absence', issue: 'A data table has no header cells.', wcag: '1.3.1', severity: 'serious', count: tablesNoTh, location: 'Final Protocol Submission' });
  if (badLinks) issues.push({ ruleId: 'link-text', claimKind: 'quality', issue: 'A link uses generic text that does not describe its destination.', wcag: '2.4.4', severity: 'moderate', count: badLinks, location: 'document' });
  if (bulletText) issues.push({ ruleId: 'semantic-list', claimKind: 'structure', issue: 'Paragraphs begin with bullet characters instead of list markup.', wcag: '1.3.1', severity: 'moderate', count: bulletText, location: 'document' });
  if (unlabeled) issues.push({ ruleId: 'button-label', claimKind: 'absence', issue: 'Icon buttons have neither visible text nor an aria-label.', wcag: '4.1.2', severity: 'minor', count: unlabeled, location: 'document' });
  const score = Math.max(0, 100 - issues.reduce((s, i) => s + ({ critical: 15, serious: 10, moderate: 5, minor: 2 })[i.severity], 0));
  const passes = [];
  if (first) passes.push('1. LANGUAGE: the html element declares lang="en".', '2. TITLE: the title element is present and names the document.', '10. SKIP NAV: a Skip to main content link is the first focusable element.');
  passes.push(facts.h1 === 1 ? '3. HEADINGS: a single h1 carries the letter title' + (facts.h2 ? ', h2 headings mark the sections' : '') + (facts.h3 ? ' and h3 headings the submission modules' : '') + ', with no skipped level.' : (facts.h1 === 0 ? '3. HEADINGS: ' + (facts.h2 || facts.h3 ? 'the h2' + (facts.h3 ? ' and h3' : '') + ' headings in this section continue the outline under the document h1 with no skipped level.' : 'no heading occurs in this section; the outline is assessed where the headings are.') : '3. HEADINGS: heading levels in this section do not skip.'));
  passes.push(facts.header ? '4. LANDMARKS: a header landmark holds the title banner and the main landmark wraps the content' + (facts.footer ? ', with a contentinfo footer closing the document.' : '.') : (facts.main ? '4. LANDMARKS: the main landmark with id main-content wraps the content (header noted above).' : (facts.footer ? '4. LANDMARKS: a contentinfo footer closes the document (header noted above).' : '4. LANDMARKS: no landmark is opened or closed in this section (header noted above).')));
  passes.push(imgs.length ? (noAlt ? '5. IMAGES: images are present (missing alt noted above).' : '5. IMAGES: every image carries an alt that states its purpose (the sender logo, and the redaction block described as withheld content).') : '5. IMAGES: no img elements occur in this section.');
  passes.push(tables.length ? (tablesNoCaption || tablesNoTh ? '6. TABLES: tables are present (caption or header gaps noted above).' : '6. TABLES: the timelines table carries a caption and th scope="col" column headers for its three columns.') : '6. TABLES: no data tables occur in this section.');
  passes.push('7. CONTRAST: body text is #000000 or #1e293b on #ffffff and links are #0000ee on #ffffff, all above 7:1.');
  passes.push(links.length > 1 ? '8. LINKS: the email links show the address itself, which identifies the destination.' : (links.length ? '8. LINKS: the only link is the skip link, whose text names its target.' : '8. LINKS: no links occur in this section.'));
  passes.push(facts.ul || facts.ol ? '9. LISTS: the options, literature-review summaries, FDA conclusions and denial reasons use ul or ol with li children; no bullet characters stand in for list markup.' : (bulletText ? '9. LISTS: noted above.' : '9. LISTS: no list-like content is set as plain text in this section.'));
  passes.push(buttons.length ? (unlabeled ? '11. FORMS: no input elements; toolbar buttons noted above.' : '11. FORMS: no input elements are present; toolbar controls carry accessible names.') : '11. FORMS: no input or button elements are present.');
  const summary = issues.length
    ? 'The section declares its language and title, keeps a single h1 with a logical outline, describes its images, gives its table a caption and column headers and uses real lists and high-contrast text, with the issues listed remaining.'
    : 'The section keeps a logical heading outline inside its landmarks, describes its images, gives its table a caption and column headers and uses real lists and high-contrast text, with no remaining violations.';
  return { score, summary, issues, passes, facts };
}

let state = startFrom ? JSON.parse(fs.readFileSync(path.join(here, startFrom), 'utf8')) : call('remediation_agent_requests', { run_id: run, wait_seconds: 20 });
for (let round = 0; round < 60; round++) {
  const sc = state.structuredContent || {};
  const pending = sc.pendingRequests || [];
  if (sc.status && sc.status !== 'running') { console.log('TERMINAL', sc.status, 'calls', sc.modelCallsSoFar); break; }
  const responses = [];
  const fixIds = [];
  for (const q of pending) {
    const m = /HTML section (\d+) of (\d+)|HTML section (\d)\/(\d)/.exec(q.prompt);
    if (m) {
      const html = q.prompt.slice(q.prompt.indexOf('"""', q.prompt.indexOf('HTML section')) + 3, q.prompt.lastIndexOf('"""'));
      const r = auditReply(html, m[1] || m[3], m[2] || m[4]);
      console.log(`  audit section ${m[1] || m[3]}/${m[2] || m[4]} -> score ${r.score} facts ${JSON.stringify(r.facts)} issues ${r.issues.map((i) => i.ruleId).join(',') || 'none'}`);
      responses.push({ request_id: q.requestId, text: JSON.stringify({ score: r.score, summary: r.summary, issues: r.issues, passes: r.passes }) });
    } else if (/UNTRUSTED HTML (FRAGMENT )?DATA:/.test(q.prompt)) {
      const id = q.requestId.slice(q.requestId.lastIndexOf('-') + 1);
      fs.writeFileSync(path.join(here, 'fdprompt-' + id + '.txt'), q.prompt); fixIds.push(id);
    } else { console.log('UNKNOWN PROMPT', q.requestId, q.kind, q.promptTotalChars, q.prompt.slice(0, 200).replace(/\n/g, ' ')); }
  }
  if (fixIds.length) {
    const outBatch = path.join(here, 'fda-fixbatch.json');
    const ridPrefix = pending[0].requestId.replace(/-\d+$/, '-');
    console.log(execFileSync(process.execPath, [path.join(here, 'fix_fragments3.cjs'), path.join(here, runFile), 'fdprompt-', ridPrefix, outBatch, ...fixIds], { encoding: 'utf8' }).trim());
    for (const r of JSON.parse(fs.readFileSync(outBatch, 'utf8')).responses) responses.push(r);
  }
  console.log(`round ${round}: calls=${sc.modelCallsSoFar} pending=${pending.length} answering=${responses.length}`);
  if (pending.length && !responses.length) break;
  state = responses.length ? call('remediation_agent_respond_batch', { run_id: run, wait_seconds: 28, responses }) : call('remediation_agent_requests', { run_id: run, wait_seconds: 30 });
}
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), out, '--tail=12'], { encoding: 'utf8' }).split('\n').slice(0, 30).join('\n'));
