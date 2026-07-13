const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const DOC_MODULE_PATH = path.join(ROOT, 'doc_pipeline_module.js');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'export-visual-gallery');
const GALLERY_ORIGIN = 'http://export-gallery.local';

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'hc', label: 'High contrast' },
];

const TEXT_SIZES = [
  { id: 's0', index: 0, label: '90%', scale: 0.9 },
  { id: 's1', index: 1, label: '100%', scale: 1 },
  { id: 's2', index: 2, label: '115%', scale: 1.15 },
  { id: 's3', index: 3, label: '130%', scale: 1.3 },
  { id: 's4', index: 4, label: '150%', scale: 1.5 },
  { id: 's5', index: 5, label: '175%', scale: 1.75 },
];

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop 1280x900', width: 1280, height: 900, isMobile: false },
  { id: 'mobile', label: 'Mobile 390x844', width: 390, height: 844, isMobile: true },
];

const HISTORY_ITEMS = [
  {
    type: 'simplified',
    id: 'gallery-reading',
    title: 'Reading Passage',
    meta: 'Readable text',
    data: [
      'Communication works best when people can name what happened, explain how they feel, and ask for what they need next.',
      '',
      'A you-statement can sound like blame. An I-statement keeps the focus on your experience and the specific behavior you want to discuss.',
      '',
      'For example: "I felt left out when the group started without me. Could we make a plan together before the next activity?"',
    ].join('\n'),
  },
  {
    type: 'outline',
    id: 'gallery-venn',
    title: 'Compare and Contrast',
    meta: 'Venn diagram',
    data: {
      main: 'Compare and Contrast',
      structureType: 'Venn Diagram',
      branches: [
        {
          title: 'You-Statements',
          items: [
            'Focus on the person and what they did wrong',
            'Can make the other person feel attacked',
            'Often leads to defensiveness',
          ],
        },
        {
          title: 'I-Statements',
          items: [
            'Focus on your own feelings and the specific behavior',
            'Make it easier for the other person to listen',
            'Help you be heard without blaming',
          ],
        },
        {
          title: 'Shared',
          items: [
            'Ways to communicate when friends disagree',
            'Involve talking about a problem',
            'Can help repair trust',
          ],
        },
      ],
    },
  },
  {
    type: 'quiz',
    id: 'gallery-quiz',
    title: 'Check for Understanding',
    meta: 'Interactive questions',
    data: {
      questions: [
        {
          type: 'mcq',
          question: 'Which sentence is most like an I-statement?',
          options: [
            'You always ignore me.',
            'I felt worried when I did not hear back.',
            'You ruined the project.',
          ],
          correctAnswer: 'I felt worried when I did not hear back.',
        },
        {
          type: 'fill-blank',
          question: 'An I-statement names a feeling and a specific ____.',
          expectedFill: 'behavior',
        },
        {
          type: 'short-answer',
          question: 'Write one sentence that could help a disagreement feel safer.',
          expectedAnswer: 'I felt upset when the plan changed. Can we talk about what happened?',
        },
      ],
    },
  },
  {
    type: 'glossary',
    id: 'gallery-glossary',
    title: 'Vocabulary',
    meta: 'Glossary table',
    data: [
      { term: 'I-statement', definition: 'A sentence that explains your feeling, the behavior, and what you need.' },
      { term: 'Specific behavior', definition: 'The exact action or moment you want to discuss.' },
      { term: 'Repair', definition: 'A step that helps rebuild trust after a conflict.' },
    ],
  },
  {
    type: 'note-taking',
    id: 'gallery-notes',
    title: 'Reflection Notes',
    meta: 'Student writing area',
    data: {
      templateType: 'double-entry',
      rows: [
        { left: 'What happened?', right: 'How did it affect me?' },
        { left: 'What do I need?', right: 'What can I ask for next?' },
      ],
    },
  },
];

const T_LABELS = {
  'export.toc': 'Contents',
  'export.teacher_toc': 'Teacher Contents',
  'output.col_term': 'Term',
  'output.col_def': 'Definition',
  'output.col_trans': 'Translation',
  'output.col_image': 'Image',
  'output.generated_via': 'Generated with AlloFlow.',
  'glossary.word_search_key': 'Word Search Key',
  'export.teacher_key_title': 'Teacher Key',
};

function expectedScreenshotCount() {
  return THEMES.length * TEXT_SIZES.length * VIEWPORTS.length;
}

function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slug(parts) {
  return parts.join('-').replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

async function buildExportHtml(browser) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.evaluate(() => {
    window.warnLog = function () {};
    window.debugLog = function () {};
    window.processMathHTML = function (value) { return value; };
    window.AlloModules = window.AlloModules || {};
  });
  await page.addScriptTag({ path: DOC_MODULE_PATH });
  const html = await page.evaluate(({ historyItems, labels }) => {
    const factory = window.AlloModules && window.AlloModules.createDocPipeline;
    if (typeof factory !== 'function') throw new Error('createDocPipeline did not register');
    const stub = async () => '{}';
    const pipeline = factory({
      callGemini: stub,
      callGeminiVision: stub,
      callImagen: async () => null,
      addToast: () => {},
      t: (key) => labels[key] || key,
      isRtlLang: () => false,
      updateExportPreview: () => {},
      getDefaultTitle: (type) => String(type || 'Resource'),
      state: {},
    });
    return pipeline.generateFullPackHTML(historyItems, 'HTML Export Visual Gallery', false, {}, {
      annotations: [],
      annotationsByResource: {
        'gallery-reading': [
          {
            id: 'teacher-note-gallery-reading',
            kind: 'note',
            x: 48,
            y: 104,
            content: 'Notice how the sentence names a feeling and a need.',
            color: 'yellow',
            author: 'teacher',
            createdAt: '2026-07-01T12:00:00.000Z',
          },
        ],
      },
    });
  }, { historyItems: HISTORY_ITEMS, labels: T_LABELS });
  await page.close();
  return html;
}

async function renderVariant(browser, html, viewport, theme, textSize, ordinal) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
  });
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(GALLERY_ORIGIN)) {
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
      return;
    }
    await route.abort();
  });
  const page = await context.newPage();
  const name = `${String(ordinal).padStart(2, '0')}-${slug([viewport.id, theme.id, textSize.id])}.png`;
  const filePath = path.join(OUTPUT_DIR, name);
  await page.goto(`${GALLERY_ORIGIN}/${name.replace(/\.png$/, '.html')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.getElementById('main-export-content'));
  await page.evaluate(({ themeId, textIndex }) => {
    const root = document.documentElement;
    if (themeId === 'light') root.removeAttribute('data-alloflow-theme');
    else root.setAttribute('data-alloflow-theme', themeId);
    const scales = [0.9, 1, 1.15, 1.3, 1.5, 1.75];
    const leads = [1.5, 1.8, 2.1];
    const safeIndex = Math.max(0, Math.min(scales.length - 1, Number(textIndex) || 0));
    const host = document.getElementById('main-export-content') || document.body;
    host.style.fontSize = scales[safeIndex] + 'em';
    host.style.lineHeight = String(leads[Math.min(leads.length - 1, Math.floor(safeIndex / 2))]);
    if (scales[safeIndex] >= 1.3) {
      document.querySelectorAll('[data-diagram-auto-open="large-text"]').forEach((el) => {
        el.open = true;
        el.setAttribute('data-auto-opened', 'true');
      });
    }
    document.querySelectorAll('[data-rt-theme]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-rt-theme') === themeId ? 'true' : 'false');
    });
  }, { themeId: theme.id, textIndex: textSize.index });
  await page.waitForTimeout(150);
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });
  await context.close();
  return {
    file: name,
    viewport: viewport.id,
    viewportLabel: viewport.label,
    theme: theme.id,
    themeLabel: theme.label,
    textSize: textSize.id,
    textSizeLabel: textSize.label,
  };
}

function buildIndex(entries) {
  const cards = entries.map((entry) => `
    <article class="card">
      <h2>${escHtml(entry.viewportLabel)} / ${escHtml(entry.themeLabel)} / ${escHtml(entry.textSizeLabel)}</h2>
      <a href="${escHtml(entry.file)}"><img src="${escHtml(entry.file)}" alt="${escHtml(entry.viewportLabel)} ${escHtml(entry.themeLabel)} ${escHtml(entry.textSizeLabel)} export screenshot"></a>
    </article>
  `).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AlloFlow HTML Export Visual Gallery</title>
  <style>
    body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
    header { max-width: 1100px; margin: 0 auto 24px; }
    h1 { margin: 0 0 8px; font-size: 1.8rem; }
    p { margin: 0; color: #475569; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; max-width: 1800px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(15,23,42,0.08); }
    .card h2 { margin: 0; padding: 10px 12px; font-size: 0.88rem; background: #e2e8f0; color: #1e293b; }
    .card img { display: block; width: 100%; height: 360px; object-fit: cover; object-position: top center; background: #ffffff; }
    .card a:focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
  </style>
</head>
<body>
  <header>
    <h1>AlloFlow HTML Export Visual Gallery</h1>
    <p>${entries.length} screenshots across ${VIEWPORTS.length} viewports, ${THEMES.length} themes, and ${TEXT_SIZES.length} text sizes. Open any image for the full-page capture.</p>
  </header>
  <main class="grid">
    ${cards}
  </main>
</body>
</html>`;
}

async function run() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const entries = [];
  try {
    const html = await buildExportHtml(browser);
    await fs.writeFile(path.join(OUTPUT_DIR, 'source-export.html'), html, 'utf8');
    let ordinal = 1;
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const textSize of TEXT_SIZES) {
          entries.push(await renderVariant(browser, html, viewport, theme, textSize, ordinal));
          ordinal += 1;
        }
      }
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    screenshotCount: entries.length,
    expectedScreenshotCount: expectedScreenshotCount(),
    resources: HISTORY_ITEMS.map((item) => ({ id: item.id, type: item.type, title: item.title })),
    entries,
  }, null, 2), 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), buildIndex(entries), 'utf8');
  console.log(`Export visual gallery wrote ${entries.length} screenshots to ${OUTPUT_DIR}`);
  console.log(`Open ${path.join(OUTPUT_DIR, 'index.html')} to review the contact sheet.`);
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = {
  THEMES,
  TEXT_SIZES,
  VIEWPORTS,
  HISTORY_ITEMS,
  OUTPUT_DIR,
  expectedScreenshotCount,
};
