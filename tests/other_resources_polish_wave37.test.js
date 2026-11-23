import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const cleanups = [];

function readRepoFile(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function assertMirrorsMatch(relPath) {
  const src = readRepoFile(relPath);
  for (const prefix of ['desktop/web-app/public/', 'desktop/web-app/build/', 'desktop/app-build/']) {
    expect(readRepoFile(prefix + relPath), prefix + relPath).toBe(src);
  }
  return src;
}

async function runAxe(container) {
  let target = container;
  let tempHost = null;
  if (container && container.ownerDocument !== document) {
    tempHost = document.createElement('div');
    tempHost.innerHTML = container.innerHTML;
    document.body.appendChild(tempHost);
    target = tempHost;
  }
  try {
    const result = await axe.run(target, {
      iframes: false,
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  } finally {
    if (tempHost) tempHost.remove();
  }
}

function loadStaticHtml(htmlFile) {
  const raw = readRepoFile(htmlFile);
  const html = raw
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '');
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + htmlFile,
  });
  cleanups.push(() => { dom.window.close(); });
  return dom.window.document;
}

afterEach(() => {
  while (cleanups.length) {
    const fn = cleanups.pop();
    fn();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 37 (Kitchen Studio Sub-Panel CSS & Public Promo/Home CSS)', () => {
  it('polishes recipe_lab_hands.css and recipe_lab_serving.css across all 3 mirrors (eliminates all 10 FOCUS-001 outline:none rules, lifts summaries/controls to 44px, adds reduced-motion)', () => {
    const hands = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_hands.css');
    const serving = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_serving.css');

    expect(hands).not.toMatch(/outline\s*:\s*none/i);
    expect(hands).toContain('#panMap [data-pan-map-piece]{cursor:grab;outline:2px solid transparent}');
    expect(hands).toContain('#panMap [data-pan-map-piece]:focus-visible{outline:3px solid #19372b;outline-offset:2px}');
    expect(hands).toContain('#panPlacementHandle{cursor:grab;outline:2px solid transparent}');
    expect(hands).toContain('#panPlacementHandle:focus-visible{outline:3px solid #19372b;outline-offset:2px}');
    expect(hands).toContain('.hands-shortcuts summary{min-height:44px;');
    expect(hands).toContain('.pan-placement-tools summary{font-size:13px;font-weight:700;min-height:44px;');
    expect(hands).toContain('.water-handling-tools summary{min-height:44px;');
    expect(hands).toContain('.pasta-stir-tools summary{min-height:44px;');
    expect(hands).toContain('.tomato-crush-tools summary{min-height:44px;');
    expect(hands).toContain('.garlic-prep-tools summary{min-height:44px;');
    expect(hands).toContain('.serving-tools summary{min-height:44px;');
    expect(hands).toContain('@media(prefers-reduced-motion:reduce)');
    expect(hands).toContain('.serving-tools summary:focus-visible{outline-color:Highlight}');

    expect(serving).not.toMatch(/outline\s*:\s*none/i);
    expect(serving).toContain('.serving-studio [data-serving-source]:focus-visible{outline:2px solid transparent}');
    expect(serving).toMatch(/\.serving-studio>summary\{[^}]*min-height:44px/);
    expect(serving).toMatch(/\.serving-adjustments>summary\{[^}]*min-height:44px/);
  });

  it('polishes recipe_lab_handwashing.css, recipe_lab_ingredients.css, recipe_lab_lens.css, and recipe_lab_quests.css across all 3 mirrors with 44px controls, focus-visible, and reduced-motion', () => {
    const wash = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_handwashing.css');
    const ing = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_ingredients.css');
    const lens = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_lens.css');
    const quests = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_quests.css');

    expect(wash).toMatch(/\.handwashing-lesson>summary\{[^}]*min-height:44px/);
    expect(wash).toContain('@media(prefers-reduced-motion:reduce){.handwashing-lesson,.handwashing-lesson *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}');

    expect(ing).toMatch(/\.ingredient-actions button\{[^}]*min-height:44px/);
    expect(ing).toMatch(/#meetIngredients\{[^}]*min-height:44px/);
    expect(ing).toContain('#ingredientList.ingredient-shelf button:focus-visible,.ingredient-actions button:focus-visible,#meetIngredients:focus-visible{outline:3px solid #315d48;outline-offset:2px}');
    expect(ing).toContain('@media(prefers-reduced-motion:reduce)');

    expect(lens).toMatch(/\.food-lens>summary\{[^}]*min-height:44px/);
    expect(lens).toMatch(/\.food-lens-controls select\{[^}]*min-height:44px/);
    expect(lens).toMatch(/\.food-lens-controls button\{[^}]*min-height:44px/);
    expect(lens).toContain('.food-lens>summary:focus-visible,.food-lens-controls select:focus-visible,.food-lens-controls button:focus-visible');
    expect(lens).toContain('@media(prefers-reduced-motion:reduce)');

    expect(quests).toMatch(/\.skill-quests>summary\{[^}]*min-height:44px/);
    expect(quests).toMatch(/\.quest-choices button\{[^}]*min-height:44px/);
    expect(quests).toMatch(/\.quest-actions button\{[^}]*min-height:44px/);
    expect(quests).toContain('@media(prefers-reduced-motion:reduce){.skill-quests,.skill-quests *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}');
  });

  it('polishes promo-home.css with dark-slider AA contrast, 44px tutorial/workflow controls, amber dark-slider focus ring, full reduced-motion, forced-colors, and 0 axe violations on index.html', async () => {
    const css = readRepoFile('promo-home.css');

    expect(css).toMatch(/\.slide-counter\s*\{[^}]*color:\s*#cbd5e1;/);
    expect(css).toMatch(/#indicator\s*\{[^}]*color:\s*#cbd5e1;/);
    expect(css).toMatch(/\.node-subtext\s*\{[^}]*fill:\s*#cbd5e1;/);
    expect(css).toMatch(/\.promo-acronym \.acro-arrow\s*\{[^}]*color:\s*#475569;/);
    expect(css).toMatch(/\.tutorial-tab\s*\{[^}]*min-height:\s*44px;/);
    expect(css).toMatch(/\.tutorial-tab \.tutorial-tab-meta\s*\{[^}]*color:\s*#475569;/);
    expect(css).toMatch(/\.home-workflow-grid a\s*\{[^}]*min-height:44px;/);
    expect(css).toContain('#slider-container :focus-visible { outline:3px solid #fbbf24; outline-offset:2px; }');
    expect(css).toContain('.slide-tag::after,');
    expect(css).toContain('.path-line,');
    expect(css).toContain('.pulse-circle,');
    expect(css).toContain('#slider-container :focus-visible, .tutorial-tab:focus-visible { outline:3px solid Highlight!important; outline-offset:2px; }');

    const doc = loadStaticHtml('index.html');
    await runAxe(doc.body);
  });

  it('polishes promotion-wave2.css and promotion-wave3.css with AA contrast, 44px links, dark-band amber focus ring, reduced-motion hover suppression, forced-colors focus, and 0 axe violations on for-districts.html and feedback.html', async () => {
    const w2 = readRepoFile('promotion-wave2.css');
    const w3 = readRepoFile('promotion-wave3.css');

    expect(w2).not.toContain('color: #64748b;');
    expect(w2).toMatch(/\.path-card a\s*\{[^}]*min-height:\s*44px;/);
    expect(w2).toMatch(/\.home-deadline-note a\s*\{[^}]*min-height:\s*44px;/);
    expect(w2).toMatch(/\.paper-toc a\s*\{[^}]*min-height:\s*44px;/);
    expect(w2).toMatch(/\.paper-download-inner a\s*\{[^}]*min-height:\s*44px;/);
    expect(w2).toContain('.deadline-panel :focus-visible,');
    expect(w2).toContain('outline: 3px solid #fbbf24;');
    expect(w2).toContain('outline: 3px solid Highlight !important;');

    expect(w3).toMatch(/\.tool-feedback-link\s*\{[^}]*min-height:\s*44px;/);
    expect(w3).toMatch(/\.noscript-nav a\s*\{[^}]*min-height:\s*44px;/);
    expect(w3).toContain('.community-feedback-inner a:focus-visible,');
    expect(w3).toContain('.home-entry-card:hover {\n        transform: none;\n    }');
    expect(w3).toContain('.home-entry-card:focus-visible,\n    .community-feedback-inner a:focus-visible,\n    .tool-feedback-link:focus-visible,\n    .noscript-nav a:focus-visible {\n        outline: 3px solid Highlight !important;');

    await runAxe(loadStaticHtml('for-districts.html').body);
    await runAxe(loadStaticHtml('feedback.html').body);
  });
});
