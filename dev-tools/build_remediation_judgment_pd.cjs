#!/usr/bin/env node
// Builds the PD module "Accessible Documents: The Calls Only a Person Can Make" from the remediation decision
// guides (remediation_review_helpers.js), so the PD lessons and the in-app "How to decide" cards share one text.
//   node dev-tools/build_remediation_judgment_pd.cjs          write catalog/pd/approved/<id>.json
//   node dev-tools/build_remediation_judgment_pd.cjs --check  exit 1 if the file is missing or stale
// After a write, run node dev-tools/regen_pd_manifest.cjs and node dev-tools/check_pd_publish.cjs.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const G = require(path.join(ROOT, 'remediation_review_helpers.js')).decisionGuides;
const PdCore = require(path.join(ROOT, 'pd_core_module.js'));
const ID = 'accessible-documents-judgment-calls';
const OUT = path.join(ROOT, 'catalog', 'pd', 'approved', ID + '.json');

// Every guide appears in exactly one theme; build() refuses otherwise.
const THEMES = [
  { key: 'words', title: 'Words, colour and links', guides: ['sensory-words', 'colour-only', 'link-wording'] },
  { key: 'structure', title: 'Headings, lists, quotations and reading order', guides: ['heading-or-emphasis', 'list-or-paragraphs', 'quotation', 'blockquote-indent', 'reading-order'] },
  { key: 'images', title: 'Pictures and their descriptions', guides: ['image-description', 'long-image-description', 'picture-placement'] },
  { key: 'accuracy', title: 'Accuracy: did anything change?', guides: ['changed-numbers', 'missing-words', 'scan-corrections'] },
  { key: 'beyond', title: 'When an accessible copy is not enough', guides: ['fillable-form', 'active-content', 'download-link'] },
];

const INTRO = [
  'Accessibility checkers are good at what they can measure: a missing image description, a heading level that skips, text with too little contrast. Some questions they cannot answer, because the answer depends on meaning. Is this bold line a heading or just emphasis? Does "below" mean "next in the text", or does the reader have to see the page? Is a changed number a page number, or a score that is now wrong?',
  'A checker flags these and leaves them to a person. This module covers the calls that come up most often when a PDF becomes an accessible document. Each lesson says what the checker cannot know, the question to ask, the usual answers and what each one leads to, then gives you practice cases like the ones real documents produce.',
  'The lessons cite the WCAG 2.1 success criteria they relate to, with links to the W3C pages that explain each one. WCAG 2.1 Level AA is the standard the U.S. Department of Justice named in its 2024 ADA Title II rule for state and local governments, including public schools. Some calls are not WCAG rules at all but matter just as much: an accessible copy has to say what the original says.',
  'The steps that mention the Workbench or running the check again refer to AlloFlow\'s document review. With another tool, make the same change there.'
].join('\n\n');

function wcagLine(g) {
  if (g.wcagRefs && g.wcagRefs.length) return 'WCAG: ' + g.wcagRefs.map((r) => r.sc + ' ' + r.name + ' (Level ' + r.level + ')').join('; ') + '.';
  return g.wcagNote || '';
}

function lessonActivity(g) {
  const body = [
    'What the checker cannot know: ' + g.checkerCannot,
    'The question to ask: ' + g.question,
    'How to decide:\n' + g.lesson.steps.map((s, i) => (i + 1) + '. ' + s).join('\n'),
    'Fine as it is: ' + g.lesson.fine + '\nNeeds a change: ' + g.lesson.fix,
    wcagLine(g),
  ].filter(Boolean).join('\n\n');
  const content = { body, keyPoints: g.options.map((o) => o.label + ': ' + o.choose + ' Then: ' + o.then) };
  if (g.wcagRefs && g.wcagRefs.length) content.links = g.wcagRefs.map((r) => ({ label: 'WCAG ' + r.sc + ' ' + r.name + ' (W3C)', url: r.url }));
  return { id: 'learn-' + g.id, type: 'read', title: g.title, content, gate: { kind: 'none' } };
}

function practiceQuestions(g) {
  const answers = g.options.filter((o) => o.id !== 'unsure');
  return g.practice.map((p) => {
    const correctIndex = answers.findIndex((o) => o.id === p.answer);
    if (correctIndex < 0) throw new Error(g.id + ': practice answer "' + p.answer + '" is not an option');
    return { prompt: p.scenario + ' ' + g.question, options: answers.map((o) => o.label), correctIndex, explanation: p.why };
  });
}

function build() {
  const placed = THEMES.flatMap((t) => t.guides);
  const ids = G.guides.map((g) => g.id);
  const missing = ids.filter((id) => !placed.includes(id));
  const unknown = placed.filter((id) => !ids.includes(id));
  const twice = placed.filter((id, i) => placed.indexOf(id) !== i);
  if (missing.length || unknown.length || twice.length) throw new Error('themes out of step with the guides: missing ' + missing + '; unknown ' + unknown + '; repeated ' + twice);
  const sections = [{
    title: 'Start here',
    activities: [{
      id: 'read-what-checkers-cannot-do', type: 'read', title: 'What a checker can and cannot decide',
      content: {
        body: INTRO,
        keyPoints: ['A checker finds what it can measure; meaning needs a person.', 'For each flagged item, ask the guide\'s question and choose an answer, or say you are not sure.', '"Not sure" is a real answer: leave the item open and ask someone who knows the content.'],
        links: [
          { label: 'WCAG 2 overview (W3C)', url: 'https://www.w3.org/WAI/standards-guidelines/wcag/' },
          { label: 'ADA Title II web rule fact sheet (ADA.gov)', url: 'https://www.ada.gov/resources/2024-03-08-web-rule/' },
        ],
      },
      gate: { kind: 'none' },
    }],
  }];
  for (const t of THEMES) {
    const guides = t.guides.map((id) => G.guideById(id));
    sections.push({
      title: t.title,
      activities: guides.map(lessonActivity).concat([{
        id: 'practice-' + t.key, type: 'quiz', title: 'Practice: ' + t.title.charAt(0).toLowerCase() + t.title.slice(1) + ' (pass at 75%)',
        content: { questions: guides.flatMap(practiceQuestions) },
        gate: { kind: 'score', threshold: 0.75 },
      }]),
    });
  }
  sections.push({
    title: 'Bring it to your documents',
    activities: [
      {
        id: 'checklist-before-sharing', type: 'checklist', title: 'Before you share an accessible document',
        content: { items: [
          'Every flagged judgment call has a decision, or someone who knows the content is checking it.',
          'Numbers, dates and names match the original.',
          'Each picture sits with the text it belongs to, and has a description or is marked decorative.',
          'Links say where they go and open the right page.',
          'If people must type into a form, they have a fillable version.',
          'I know who to ask when I am not sure.',
        ] },
        gate: { kind: 'none' },
      },
      {
        id: 'reflect-your-documents', type: 'reflect', title: 'Name the calls you will meet',
        content: { prompt: 'Think of a document you share often, such as a newsletter, a syllabus or a form. Which two of these calls are most likely to come up in it, and how will you decide them? Who at your school will you ask when you are not sure?' },
        gate: { kind: 'none' },
      },
    ],
  });
  return {
    schema_version: 'pd-1.0',
    kind: 'pd_module',
    metadata: {
      id: ID,
      version: '1.0.0',
      language: 'en-US',
      title: 'Accessible Documents: The Calls Only a Person Can Make',
      topic: 'Accessibility',
      summary: 'How to decide the questions an accessibility checker leaves to a person (headings, colour, reading order, image descriptions, changed numbers and more), with the WCAG criteria behind each and practice cases from real school documents.',
      estMinutes: 40,
      credit: 'AlloFlow Seed Library',
      license: 'CC-BY-SA-4.0',
      audience: 'educator',
    },
    sections,
  };
}

function render() {
  const mod = build();
  const v = PdCore.validatePdModule(mod);
  if (!v.ok) throw new Error('validatePdModule: ' + v.error);
  const readiness = PdCore.auditAccessibilityReadiness(v.module);
  if (readiness.status !== 'ready-for-render-audit') throw new Error('accessibility preflight: ' + readiness.issues.map((i) => i.message).join('; '));
  return JSON.stringify(mod, null, 2) + '\n';
}

if (require.main === module) {
  const text = render();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (current !== text) { console.error(path.relative(ROOT, OUT) + ' is ' + (current == null ? 'missing' : 'stale') + '; run node dev-tools/build_remediation_judgment_pd.cjs'); process.exit(1); }
    console.log(path.relative(ROOT, OUT) + ' is current');
  } else {
    const tmp = OUT + '.tmp';
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, OUT);
    console.log('Wrote ' + path.relative(ROOT, OUT));
  }
}

module.exports = { build, render, THEMES, ID, OUT };
