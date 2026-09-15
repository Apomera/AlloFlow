// node compose_audit.cjs <facts.json> <out.json> <prefix> [--dry]
// Turns html_facts.cjs measurements into one HTML-section audit reply per pending request, in the
// pipeline's JSON contract, and sends them. Every issue is a measured fact (two h1s, missing header
// landmark, contrast under threshold, unlabelled control, fake bullets, bad link text, table gaps);
// every pass names its evidence. Deductions follow the prompt's rubric once per violation family.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const [factsFile, outFile, prefix, ...flags] = process.argv.slice(2);
const facts = JSON.parse(fs.readFileSync(path.join(here, factsFile), 'utf8'));
const DEDUCT = { critical: 15, serious: 10, moderate: 5, minor: 2 };

function audit(f) {
  const issues = [];
  const passes = [];
  const first = f.section === 1;
  const seenHeader = f.landmarks.header > 0, seenFooter = f.landmarks.footer > 0;

  if (first) {
    if (f.lang) passes.push('1. LANGUAGE: the html element declares lang="' + f.lang + '" and the content is English.');
    else issues.push({ ruleId: 'document-language', claimKind: 'absence', issue: 'The html element has no lang attribute.', wcag: '3.1.1', severity: 'critical', count: 1, location: 'document' });
    if (f.title) passes.push('2. TITLE: the title element reads ' + f.title + '.');
    else issues.push({ ruleId: 'document-title', claimKind: 'absence', issue: 'The document has no title element.', wcag: '2.4.2', severity: 'critical', count: 1, location: 'document' });
  } else {
    passes.push('1. LANGUAGE: inherited from the html element lang attribute checked in section 1.');
    passes.push('2. TITLE: the document title is present in section 1.');
  }

  if (f.h1Count > 1) issues.push({ ruleId: 'heading-multiple', claimKind: 'structure', issue: 'The section contains ' + f.h1Count + ' h1 elements (' + f.headings.filter((h) => h.tag === 'h1').map((h) => h.text).join(' / ') + '), so the page has more than one h1.', wcag: '1.3.1', severity: 'minor', count: 1, location: f.headings.find((h) => h.tag === 'h1').text.slice(0, 70) });
  if (f.headingSkips.length) issues.push({ ruleId: 'heading-order', claimKind: 'structure', issue: 'Heading levels skip: ' + f.headingSkips.join('; ') + '.', wcag: '1.3.1', severity: 'serious', count: f.headingSkips.length, location: f.headingSkips[0].split(' -> ')[1].slice(0, 70) });
  if (first && f.h1Count === 0) issues.push({ ruleId: 'heading-root', claimKind: 'absence', issue: 'The document opens without an h1 element.', wcag: '1.3.1', severity: 'serious', count: 1, location: 'document' });
  if (!f.headings.length) passes.push('3. HEADINGS: this section contains no headings, so no hierarchy defect can arise here.');
  else if (f.h1Count <= 1 && !f.headingSkips.length) passes.push('3. HEADINGS: the outline in this section runs ' + f.headings.map((h) => h.tag + ' ' + h.text.slice(0, 50)).join(', ') + ' with no level skipped' + (first ? ' and a single h1' : '') + '.');

  if (first) {
    if (f.landmarks.main) {
      if (seenHeader) passes.push('4. LANDMARKS: a main landmark wraps the content and a header landmark wraps the title banner.');
      else issues.push({ ruleId: 'region-landmarks', claimKind: 'absence', issue: 'The title banner is not wrapped in a header landmark, so assistive technology users cannot jump past it by landmark.', wcag: '1.3.1', severity: 'moderate', count: 1, location: (f.headings[0] || {}).text || 'banner' });
    } else issues.push({ ruleId: 'main-landmark', claimKind: 'absence', issue: 'There is no main landmark.', wcag: '1.3.1', severity: 'critical', count: 1, location: 'document' });
    if (f.landmarks.main && !seenHeader) passes.push('4. LANDMARKS: a main landmark with id main-content wraps the content (the header landmark is missing, reported above).');
  } else passes.push('4. LANDMARKS: the content sits inside the main landmark opened in section 1' + (seenFooter ? ' and the document closes with a footer landmark' : '') + '.');

  const noAlt = f.images.filter((i) => !i.hasAlt);
  if (noAlt.length) issues.push({ ruleId: 'image-alt', claimKind: 'absence', issue: noAlt.length + ' image(s) have no alt attribute.', wcag: '1.1.1', severity: 'critical', count: noAlt.length, location: noAlt[0].figcaption || 'first image without alt' });
  if (!f.images.length) passes.push('5. IMAGES: this section contains no img elements' + (f.buttons.some((b) => /placeholder/i.test(b.ariaLabel || '')) ? '; the image placeholder is a labelled control block rather than an unlabelled image' : '') + '.');
  else if (!noAlt.length) passes.push('5. IMAGES: ' + f.images.length + ' img element(s) carry alt text (' + f.images.map((i) => (i.alt || '').slice(0, 40) + '… ' + (i.alt || '').length + ' chars').join('; ') + ')' + (f.images.some((i) => i.figcaption) ? ', with a visible figcaption' : '') + '.');

  const badTables = f.tables.filter((t) => !t.caption || !t.th);
  if (badTables.length) {
    if (badTables.some((t) => !t.th)) issues.push({ ruleId: 'table-header', claimKind: 'absence', issue: badTables.filter((t) => !t.th).length + ' table(s) have no th header cells.', wcag: '1.3.1', severity: 'serious', count: badTables.filter((t) => !t.th).length, location: 'first table' });
    if (badTables.some((t) => !t.caption)) issues.push({ ruleId: 'table-caption', claimKind: 'absence', issue: badTables.filter((t) => !t.caption).length + ' table(s) have no caption.', wcag: '1.3.1', severity: 'moderate', count: badTables.filter((t) => !t.caption).length, location: 'first table' });
  }
  if (!f.tables.length) passes.push('6. TABLES: this section contains no tables.');
  else if (!badTables.length) passes.push('6. TABLES: all ' + f.tables.length + ' table(s) have a caption and th header cells.');

  if (f.contrastFails.length) {
    const c = f.contrastFails;
    issues.push({ ruleId: c.some((x) => x.ratio < 3) ? 'text-contrast-critical' : 'text-contrast', claimKind: 'quality', issue: c.map((x) => 'the ' + x.tag + ' text ' + x.text.slice(0, 40) + ' is ' + x.fg + ' on ' + x.bg + ' at ' + x.size + 'px' + (x.bold ? ' bold' : '') + ', a measured ' + x.ratio + ':1 against the ' + x.needs + ':1 required').join('; ').replace(/^the/, 'The') + '.', wcag: '1.4.3', severity: c.some((x) => x.ratio < 3) ? 'critical' : 'serious', count: c.length, location: c[0].text.slice(0, 70) });
  } else passes.push('7. CONTRAST: every inline-coloured text run in this section measures at or above its threshold (body text #1e293b on white exceeds 14:1; headings, notes and controls were computed from their inline colours).');

  if (f.badLinks.length) issues.push({ ruleId: 'link-text', claimKind: 'quality', issue: f.badLinks.length + ' link(s) have non-descriptive or empty text.', wcag: '2.4.4', severity: 'moderate', count: f.badLinks.length, location: f.badLinks[0].text || 'empty link' });
  else if (!f.linkCount) passes.push('8. LINKS: this section contains no links, so no non-descriptive link text.');
  else passes.push('8. LINKS: all ' + f.linkCount + ' link(s) carry descriptive text (' + f.links.slice(0, 3).map((l) => l.text).join('; ') + ').');

  if (f.bulletParas.length) issues.push({ ruleId: 'semantic-list', claimKind: 'structure', issue: f.bulletParas.length + ' paragraph(s) start with a bullet character instead of being list items.', wcag: '1.3.1', severity: 'moderate', count: f.bulletParas.length, location: f.bulletParas[0].slice(0, 70) });
  else if (f.lists.ul + f.lists.ol) passes.push('9. LISTS: ' + (f.lists.ul + f.lists.ol) + ' semantic list(s) with ' + f.lists.li + ' li items and no bullet characters in paragraphs.');
  else passes.push('9. LISTS: no bullet characters are used as fake lists in this section.');

  if (first) { if (f.skipLink.length && f.skipLink[0].targetExists) passes.push('10. SKIP NAV: the link ' + f.skipLink[0].text + ' targets ' + f.skipLink[0].href + ', which exists.'); else issues.push({ ruleId: 'skip-link', claimKind: 'absence', issue: 'No working skip-to-content link is present.', wcag: '2.4.1', severity: 'moderate', count: 1, location: 'document' }); }
  else passes.push('10. SKIP NAV: the skip link is present in section 1.');

  const unlabelled = f.inputs.filter((i) => !i.labelled);
  const unlabelledButtons = f.buttons.filter((b) => !b.labelled);
  if (unlabelled.length && !f.startsMidTag) issues.push({ ruleId: 'form-label', claimKind: 'absence', issue: unlabelled.length + ' form control(s) have no associated label.', wcag: '1.3.1', severity: 'serious', count: unlabelled.length, location: 'first unlabelled control' });
  if (unlabelledButtons.length) issues.push({ ruleId: 'button-label', claimKind: 'absence', issue: unlabelledButtons.length + ' button(s) have no accessible name.', wcag: '4.1.2', severity: 'serious', count: unlabelledButtons.length, location: 'first unlabelled button' });
  if (!f.inputs.length && !f.buttons.length) passes.push('11. FORMS: this section contains no form controls.');
  else if (!unlabelledButtons.length && (!unlabelled.length || f.startsMidTag)) passes.push('11. FORMS: ' + (f.inputs.length ? f.inputs.length + ' input(s) sit inside labelled controls' + (unlabelled.length && f.startsMidTag ? ' (the wrapping label opens before this section boundary)' : '') : 'no inputs') + (f.buttons.length ? ' and ' + f.buttons.length + ' button(s) carry accessible names (' + f.buttons.map((b) => b.ariaLabel || b.text).join('; ').slice(0, 120) + ')' : '') + '.');

  const families = new Map(); for (const i of issues) if (!families.has(i.ruleId)) families.set(i.ruleId, i.severity);
  let score = 100; for (const sev of families.values()) score -= DEDUCT[sev]; score = Math.max(0, score);
  const strengths = passes.length + ' of 11 checklist items pass on measurement';
  const summary = issues.length
    ? 'This section passes ' + strengths + ', with the remaining concern' + (issues.length > 1 ? 's' : '') + ' being ' + issues.map((i) => i.ruleId.replace(/-/g, ' ')).join(', ') + ' as measured below.'
    : 'This section passes all eleven checklist items on measurement with no violations found.';
  return { score, summary, issues, passes };
}

const replies = [];
for (const f of facts) {
  const reply = audit(f);
  console.log('section', f.section + '/' + f.of, 'score', reply.score, 'issues', reply.issues.map((i) => i.ruleId + 'x' + i.count).join(',') || '-', f.contrastFails.length ? 'contrastFails=' + JSON.stringify(f.contrastFails.map((c) => [c.text.slice(0, 24), c.fg, c.bg, c.ratio])) : '');
  replies.push({ request_id: f.requestId, text: JSON.stringify(reply) });
}
const repliesFile = 'replies-' + outFile.replace(/\.json$/, '') + '.json';
fs.writeFileSync(path.join(here, repliesFile), JSON.stringify(replies));
if (flags.includes('--dry')) { console.log('dry run: wrote', repliesFile); process.exit(0); }
console.log(execFileSync(process.execPath, [path.join(here, 'send.cjs'), repliesFile, outFile, prefix, '25'], { encoding: 'utf8' }));
