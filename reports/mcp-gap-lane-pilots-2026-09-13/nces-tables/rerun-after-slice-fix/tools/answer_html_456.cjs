// Baseline HTML audit replies for sections 4-6, from html_facts.cjs measurements.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const facts = JSON.parse(fs.readFileSync(path.join(here, 'facts-9.json'), 'utf8'));
const byId = Object.fromEntries(facts.map((f) => [f.section, f.requestId]));
if (!byId[4] || !byId[5] || !byId[6]) throw new Error('expected sections 4, 5 and 6 pending: ' + JSON.stringify(Object.keys(byId)));

const s4 = {
  score: 100,
  summary: 'This section carries the Figure 4 image with a complete alt text and a visible figcaption, labelled file inputs and high-contrast text throughout, with no violations found in the eleven checklist items.',
  issues: [],
  passes: [
    '1. LANGUAGE: inherited from the html element lang="en" checked in section 1.',
    '2. TITLE: the document title is present in section 1.',
    '3. HEADINGS: this section contains no headings, so no hierarchy defect can arise here.',
    '4. LANDMARKS: the content sits inside the main landmark opened in section 1.',
    '5. IMAGES: the Figure 4 img carries a complete alt text describing the three school-type series and their values, and its figure has a visible figcaption (the alt is long, about 1,100 characters, but informative and not empty).',
    '6. TABLES: this section contains no tables.',
    '7. CONTRAST: body text #1e293b on white exceeds 14:1, note text #475569 on white is 7.6:1, and the adjustment control is white on #475569 at 7.6:1.',
    '8. LINKS: this section contains no links, so no non-descriptive link text.',
    '9. LISTS: no bullet characters are used as fake lists in this section.',
    '10. SKIP NAV: the skip link is present in section 1.',
    '11. FORMS: both file inputs in this section sit inside their labelled upload controls.',
  ],
};

const s5 = {
  score: 90,
  summary: 'This section keeps the final h3 subsection, a labelled remove button on the Figure 5 placeholder and high-contrast body and note text, with the remaining concern being the slate h3 colour that falls just under the 4.5:1 text contrast threshold.',
  issues: [
    { ruleId: 'text-contrast', claimKind: 'quality', issue: 'The h3 heading Racial/Ethnic Enrollment in Public and Private Schools is 1.1rem bold text in #5c7c8d on a white background, a measured 4.45:1, which is below the 4.5:1 required for text under 18.66px bold.', wcag: '1.4.3', severity: 'serious', count: 1, location: 'Racial/Ethnic Enrollment in Public and Private Schools' },
  ],
  passes: [
    '1. LANGUAGE: inherited from the html element lang="en" checked in section 1.',
    '2. TITLE: the document title is present in section 1.',
    '3. HEADINGS: the single heading in this section is an h3 under the chapter h2, with no level skipped.',
    '4. LANDMARKS: the content sits inside the main landmark opened in section 1.',
    '5. IMAGES: this section contains no img elements; the Figure 5 placeholder is a labelled control block rather than an unlabelled image.',
    '6. TABLES: this section contains no tables.',
    '7. CONTRAST: body text #1e293b on white exceeds 14:1, note text #475569 on white is 7.6:1, the placeholder label #334155 on #f1f5f9 exceeds 9:1, the remove button #b91c1c on #fee2e2 is 5.3:1 and the Upload image control is white on #1d4ed8 at 6.7:1.',
    '8. LINKS: this section contains no links, so no non-descriptive link text.',
    '9. LISTS: no bullet characters are used as fake lists in this section.',
    '10. SKIP NAV: the skip link is present in section 1.',
    '11. FORMS: the only control in this section is the remove button, which carries aria-label Remove this image placeholder.',
  ],
};

const s6 = {
  score: 90,
  summary: 'This closing section carries the two racial/ethnic change lists as semantic lists, labelled placeholder buttons and a footer landmark, with the remaining concern being the white text of the injected Generate (AI) button on teal at 3.74:1.',
  issues: [
    { ruleId: 'text-contrast', claimKind: 'quality', issue: 'The Generate (AI) button is 12px bold white text on #0d9488, a measured 3.74:1, which is below the 4.5:1 required for text under 18.66px bold.', wcag: '1.4.3', severity: 'serious', count: 1, location: 'Generate (AI)' },
  ],
  passes: [
    '1. LANGUAGE: inherited from the html element lang="en" checked in section 1.',
    '2. TITLE: the document title is present in section 1.',
    '3. HEADINGS: this section contains no headings, so no hierarchy defect can arise here.',
    '4. LANDMARKS: the document closes with a footer landmark.',
    '5. IMAGES: this section contains no img elements.',
    '6. TABLES: this section contains no tables.',
    '7. CONTRAST: body text #1e293b on white exceeds 14:1, note and footer text #475569 on white is 7.6:1, and the Pick extracted control is white on #7c3aed at 5.7:1.',
    '8. LINKS: this section contains no links, so no non-descriptive link text.',
    '9. LISTS: the decrease and increase bullets are two semantic ul lists with six li items and no bullet characters in paragraphs.',
    '10. SKIP NAV: the skip link is present in section 1.',
    '11. FORMS: the Pick extracted and Generate (AI) buttons carry aria-labels and there are no unlabelled inputs.',
  ],
};

const replies = [
  { request_id: byId[4], text: JSON.stringify(s4) },
  { request_id: byId[5], text: JSON.stringify(s5) },
  { request_id: byId[6], text: JSON.stringify(s6) },
];
fs.writeFileSync(path.join(here, 'replies-html456.json'), JSON.stringify(replies));
console.log(execFileSync(process.execPath, [path.join(here, 'send.cjs'), 'replies-html456.json', 'req-10.json', 'r10', '30'], { encoding: 'utf8' }));
