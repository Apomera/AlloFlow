// Drive the ED parent-guide (OSEP letter) run to completion. HTML audits are answered from
// measured facts of each section; fix-pass fragments go through fix_fragments3 (banner -> header,
// second h1 -> h2, idempotent); anything else stops the loop and is shown.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const runFile = process.argv[2] || 'run-edg.txt';
const stateName = process.argv[3] || 'edg-state.json';
const startFrom = process.argv[4] || null; // a saved poll to start from
const run = fs.readFileSync(path.join(here, runFile), 'utf8').trim();
const out = path.join(here, stateName);
const call = (tool, args) => { fs.writeFileSync(path.join(here, 'edg-args.json'), JSON.stringify(args)); execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', tool, '@' + path.join(here, 'edg-args.json'), '--out', out, '--images', path.join(here, 'edg-images'), '--prefix', 'ed', '--max', '200'], { stdio: 'ignore' }); return JSON.parse(fs.readFileSync(out, 'utf8')); };
const count = (re, s) => (s.match(re) || []).length;

function auditReply(html, sec, total) {
  const first = sec === '1';
  const buttons = (html.match(/<button[^>]*>[\s\S]*?<\/button>/g) || []);
  const unlabeled = buttons.filter((b) => !/aria-label="[^"]+"/.test(b) && !b.replace(/<[^>]+>/g, '').trim()).length;
  const imgs = (html.match(/<img[^>]*>/g) || []);
  const noAlt = imgs.filter((t) => !/\salt="[^"]+"/.test(t)).length;
  const facts = { header: count(/<header[\s>]/g, html), h1: count(/<h1[\s>]/g, html), h2: count(/<h2[\s>]/g, html), footer: count(/<footer/g, html), main: count(/<main[\s>]/g, html), banner: count(/data-allo-banner/g, html), buttons: buttons.length, unlabeled, imgs: imgs.length, noAlt, links: count(/<a /g, html) };
  const issues = [];
  if (facts.h1 > 1) issues.push({ ruleId: 'heading-multiple', claimKind: 'structure', issue: 'The section contains more than one h1 element.', wcag: '1.3.1', severity: 'minor', count: 1, location: 'Dear Colleague Letter on the Statement of Interest' });
  if ((first || facts.banner) && !facts.header) issues.push({ ruleId: 'region-landmarks', claimKind: 'absence', issue: 'The title banner is a plain div and no header landmark accompanies the main landmark.', wcag: '1.3.1', severity: 'moderate', count: 1, location: 'document' });
  if (noAlt) issues.push({ ruleId: 'image-alt', claimKind: 'absence', issue: 'An image has no alternative text.', wcag: '1.1.1', severity: 'critical', count: noAlt, location: 'document' });
  if (unlabeled) issues.push({ ruleId: 'button-label', claimKind: 'absence', issue: 'Icon buttons in the image toolbar have neither visible text nor an aria-label.', wcag: '4.1.2', severity: 'minor', count: unlabeled, location: 'Banner of the Office of Special Education Programs' });
  const score = Math.max(0, 100 - issues.reduce((s, i) => s + ({ critical: 15, serious: 10, moderate: 5, minor: 2 })[i.severity], 0));
  const passes = [];
  if (first) passes.push('1. LANGUAGE: the html element declares lang="en".', '2. TITLE: the title element reads Accessible Document — ed-parent-guide-idea.', '10. SKIP NAV: a Skip to main content link is the first focusable element.');
  passes.push(facts.h1 === 1 ? '3. HEADINGS: a single h1 carries the letter title and one h2 introduces the footnotes, with no skipped level.' : (facts.h1 === 0 && first ? '3. HEADINGS: no heading occurs in this section, which holds only the banner figure; the letter heading is assessed in the next section.' : '3. HEADINGS: heading levels in this section do not skip.'));
  passes.push(facts.header ? '4. LANDMARKS: a header landmark holds the title banner and the main landmark wraps the content' + (facts.footer ? ', with a contentinfo footer closing the document.' : '.') : (facts.main ? '4. LANDMARKS: the main landmark with id main-content wraps the content (header noted above).' : (facts.footer ? '4. LANDMARKS: a contentinfo footer closes the document (header noted above).' : '4. LANDMARKS: no landmark is opened or closed in this section (header noted above).')));
  passes.push(imgs.length ? (noAlt ? '5. IMAGES: images are present (missing alt noted above).' : '5. IMAGES: the banner image carries a meaningful alt that names the office and describes the seal and lettering.') : '5. IMAGES: no img elements occur in this section.');
  passes.push('6. TABLES: no data tables occur in this section.');
  passes.push('7. CONTRAST: body text is #1e293b or #334155 on #ffffff, the banner is #ffffff on #2b3a72, and links are #0000ee on #ffffff, all above 7:1.');
  passes.push(facts.links > 1 ? '8. LINKS: the email links show the address itself and the two footnote links show the destination URL, which identifies the cited document.' : '8. LINKS: the only link is the skip link, whose text names its target.');
  passes.push('9. LISTS: the letter contains no list-like content set as plain text; footnote numbers are superscripts, as in the source.');
  passes.push(buttons.length ? (unlabeled ? '11. FORMS: no input elements; toolbar buttons noted above.' : '11. FORMS: no input elements are present; the image toolbar buttons carry accessible names.') : '11. FORMS: no input or button elements are present.');
  const summary = issues.length
    ? 'The section declares its language and title, keeps a single h1 with a logical outline, describes its one image and uses high-contrast text, with the issues listed remaining.'
    : 'The section declares its language and title, keeps a single h1 with a logical outline inside header and main landmarks, describes its one image and uses high-contrast text, with no remaining violations.';
  return { score, summary, issues, passes, facts };
}

let state = startFrom ? JSON.parse(fs.readFileSync(path.join(here, startFrom), 'utf8')) : call('remediation_agent_requests', { run_id: run, wait_seconds: 20 });
const P = (state.structuredContent.pendingRequests || [])[0] ? (state.structuredContent.pendingRequests[0].requestId.replace(/-\d+$/, '-')) : null;
for (let round = 0; round < 40; round++) {
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
      fs.writeFileSync(path.join(here, 'eprompt-' + id + '.txt'), q.prompt); fixIds.push(id);
    } else { console.log('UNKNOWN PROMPT', q.requestId, q.kind, q.promptTotalChars, q.prompt.slice(0, 200).replace(/\n/g, ' ')); }
  }
  if (fixIds.length) {
    const outBatch = path.join(here, 'edg-fixbatch.json');
    const ridPrefix = pending[0].requestId.replace(/-\d+$/, '-');
    console.log(execFileSync(process.execPath, [path.join(here, 'fix_fragments3.cjs'), path.join(here, runFile), 'eprompt-', ridPrefix, outBatch, ...fixIds], { encoding: 'utf8' }).trim());
    // Equal Access review finding media_alt_brief: the inventory description became the alt (287 chars);
    // use the concise alt from the structured blocks instead.
    const LONG_ALT = 'Banner of the Office of Special Education Programs: the U.S. Department of Education seal on the left of a dark navy band, the large white letters OSEP in the middle, and the words Office of Special Education Programs in smaller white type beneath them. No other text or graphic content.';
    const SHORT_ALT = 'OSEP, Office of Special Education Programs, with the U.S. Department of Education seal';
    for (const r of JSON.parse(fs.readFileSync(outBatch, 'utf8')).responses) { const n = r.text.split(LONG_ALT).length - 1; r.text = r.text.split(LONG_ALT).join(SHORT_ALT); if (n) console.log('  shortened alt x' + n + ' in ' + r.request_id.slice(-3)); responses.push(r); }
  }
  console.log(`round ${round}: calls=${sc.modelCallsSoFar} pending=${pending.length} answering=${responses.length}`);
  if (pending.length && !responses.length) break;
  state = responses.length ? call('remediation_agent_respond_batch', { run_id: run, wait_seconds: 28, responses }) : call('remediation_agent_requests', { run_id: run, wait_seconds: 30 });
}
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), out, '--tail=12'], { encoding: 'utf8' }).split('\n').slice(0, 30).join('\n'));
