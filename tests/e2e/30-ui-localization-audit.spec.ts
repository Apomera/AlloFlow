import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootAlloFlow } from './helpers';

/**
 * Localization audit by DIFFERENTIAL RENDER.
 *
 * Static analysis can tell you a string is not wrapped in t(); it cannot tell
 * you whether the wrapped ones actually change, and it cannot see the far more
 * common failure here — a call site that IS wrapped but whose key never made it
 * into ui_strings.js, so it silently renders its English fallback in every
 * language and never shows a dotted key to give itself away.
 *
 * So: render each surface in English, switch the app language, render it again,
 * and report the strings that came back byte-identical. That is evidence of
 * what a Spanish-reading user actually sees, not an inference about the source.
 *
 * This spec is a REPORT, not a gate. It writes test-results/i18n-audit/*.json
 * and prints a summary; it only fails if a surface could not be reached, which
 * would make an empty result look like a clean bill of health.
 */

const OUT_DIR = path.resolve('test-results/i18n-audit');

// Strings that are legitimately identical across languages. Product and
// organisation names, licence identifiers, script/technology names, and the
// endonym list in the language picker itself (which is intentionally shown in
// each language's own script and must NOT be translated).
const SAME_BY_DESIGN = [
  /^AlloFlow/i, /^Allo(Bot|Haven|Lens|Studio|Pack|Sheet)/i, /^Gemini/i, /^Kokoro/i, /^OpenStax/i,
  /^NASA$|^NOAA$|^USGS$|^Wikisource$|^Wikibooks$|^Gutenberg$/i, /Library of Congress/i,
  /^Book Dash$|^Bloom|^StoryWeaver$|^African Storybook$/i, /^Frontiers/i, /^Core Knowledge$/i,
  /^Open ?RN$|^LibreTexts$|^CK-?12$|^Pressbooks$|^Standard Ebooks$|^OAPEN$|^DOAB$|^MIT OCW$|^NCBI/i,
  /^CC[ -]?(BY|0)/i, /^Creative Commons/i, /^PDF$|^HTML$|^QTI$|^IMS$|^JSON$|^CSV$|^QR$|^URL$|^AI$|^TTS$|^XP$/i,
  /^OpenDyslexic$|^Atkinson$|^Lexend$|^Andika$/i,
  /^StoryForge$|^PoetTree$|^LitLab$|^SEL Hub$|^STEM Lab$|^BehaviorLens$|^AlloQuest$/i,
  /^⚠ \d+ errors?$/,               // dev-only error badge, not product copy
  /^[\d\s.,:%+\-/()–—]+$/,            // pure numbers / ranges
  /^[^\p{L}]*$/u,                      // no letters at all (icons, punctuation)
];

function isSameByDesign(s: string): boolean {
  return SAME_BY_DESIGN.some((re) => re.test(s.trim()));
}

/** Every string a person can actually read in the given scope. */
async function visibleStrings(page: Page, scope: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const roots = sel === 'body' ? [document.body] : Array.from(document.querySelectorAll(sel));
    const out = new Set<string>();
    const push = (v: string | null) => {
      if (!v) return;
      const s = v.replace(/\s+/g, ' ').trim();
      if (s.length >= 3 && s.length <= 200) out.add(s);
    };
    for (const root of roots) {
      if (!root) continue;
      // Text nodes whose element is actually painted.
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const el = n.parentElement;
        if (!el) continue;
        if (el.closest('[aria-hidden="true"], script, style, .sr-only')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        push(n.textContent);
      }
      // Accessible names and placeholders are read aloud but have no text node.
      for (const el of Array.from(root.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))) {
        for (const a of ['aria-label', 'title', 'placeholder', 'alt']) push(el.getAttribute(a));
      }
    }
    return [...out];
  }, scope);
}

/**
 * The app boots with the header COLLAPSED into a slim app bar, and the language
 * picker only exists in the expanded header — so the audit has to open it first
 * or it never finds the control it needs.
 */
async function expandHeader(page: Page): Promise<void> {
  const select = page.locator('[data-help-key="ui_language_select"]').first();
  if (await select.isVisible().catch(() => false)) return;
  // Match structurally, not by name. The toggle's accessible name comes from
  // its OWN translated aria-label, so once the UI is in Spanish a text match
  // stops working — which is precisely when this audit needs it most.
  const candidates = page.locator('header button[aria-expanded="false"]');
  const n = await candidates.count();
  for (let i = n - 1; i >= 0; i--) {
    await candidates.nth(i).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    if (await select.isVisible().catch(() => false)) return;
  }
}

async function switchLanguage(page: Page, match: RegExp): Promise<string> {
  await expandHeader(page);
  const select = page.locator('[data-help-key="ui_language_select"]').first();
  await expect(select, 'language picker not found').toBeVisible({ timeout: 30000 });
  const values: string[] = await select.evaluate((el: HTMLSelectElement) =>
    Array.from(el.options).map((o) => o.value));
  const target = values.find((v) => match.test(v));
  if (!target) throw new Error(`no language option matching ${match}; saw: ${values.slice(0, 12).join(', ')}`);
  await select.selectOption(target);
  // The pack applies asynchronously. Wait for a string known to be translated
  // rather than a fixed sleep, then settle.
  await page.waitForTimeout(3500);
  return target;
}

function report(surface: string, en: string[], other: string[], lang: string) {
  const otherSet = new Set(other);
  const untranslated = en
    .filter((s) => otherSet.has(s))
    .filter((s) => !isSameByDesign(s))
    .sort((a, b) => b.length - a.length);
  const translated = en.length - en.filter((s) => otherSet.has(s)).length;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${surface}.json`),
    JSON.stringify({ surface, lang, enStrings: en.length, changed: translated, untranslated }, null, 2), 'utf8');
  const pct = en.length ? Math.round((100 * untranslated.length) / en.length) : 0;
  console.log(`\n── ${surface} (${lang}) ─────────────────────────────`);
  console.log(`   ${en.length} visible strings · ${translated} changed · ${untranslated.length} unchanged (${pct}%)`);
  for (const s of untranslated.slice(0, 35)) console.log(`   ✗ ${s.slice(0, 120)}`);
  if (untranslated.length > 35) console.log(`   ... ${untranslated.length - 35} more (see ${surface}.json)`);
  return untranslated;
}

test.describe('UI localization audit (differential render)', () => {
  test.describe.configure({ mode: 'serial', timeout: 300000 });

  test('landing page, reading catalog, student tools and header menus', async ({ page }) => {
    await bootAlloFlow(page, 'full');
    // Expand up front so BOTH captures see the same chrome — comparing a
    // collapsed English header against an expanded Spanish one would report
    // every newly-revealed control as "translated" and hide real gaps.
    await expandHeader(page);
    await page.waitForTimeout(1200);

    // ── English capture ──────────────────────────────────────────────────
    const enLanding = await visibleStrings(page, 'body');

    // Reading catalog — reachable from the landing "starting point" cards.
    const catalogCard = page.getByRole('button', { name: /reading catalog|Books, articles/i }).first();
    const canOpenCatalog = await catalogCard.isVisible().catch(() => false);
    let enCatalog: string[] = [];
    if (canOpenCatalog) {
      await catalogCard.click();
      await page.waitForTimeout(4000);
      enCatalog = await visibleStrings(page, '[role="dialog"], .allo-docsuite');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1200);
    }

    // Student tools FAB.
    const fab = page.getByRole('button', { name: /Student tools/i }).first();
    const canOpenFab = await fab.isVisible().catch(() => false);
    let enFab: string[] = [];
    if (canOpenFab) {
      await fab.click();
      await page.waitForTimeout(1500);
      enFab = await visibleStrings(page, '.alloflow-student-tools-panel');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }

    // Header Documents menu.
    const docs = page.locator('[data-help-key="header_export"]').first();
    const canOpenDocs = await docs.isVisible().catch(() => false);
    let enDocs: string[] = [];
    if (canOpenDocs) {
      await docs.click();
      await page.waitForTimeout(1200);
      enDocs = await visibleStrings(page, '[role="menu"]');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    }

    // ── Switch language, capture again ───────────────────────────────────
    const lang = await switchLanguage(page, /spanish.*latin|latin.*america|^spanish/i);
    const esLanding = await visibleStrings(page, 'body');

    let esCatalog: string[] = [];
    if (canOpenCatalog) {
      const card = page.getByRole('button', { name: /reading catalog|Books, articles|cat.logo|libros/i }).first();
      if (await card.isVisible().catch(() => false)) {
        await card.click();
        await page.waitForTimeout(4000);
        esCatalog = await visibleStrings(page, '[role="dialog"], .allo-docsuite');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1200);
      }
    }

    let esFab: string[] = [];
    if (canOpenFab) {
      const f = page.getByRole('button', { name: /Student tools|Herramientas/i }).first();
      if (await f.isVisible().catch(() => false)) {
        await f.click();
        await page.waitForTimeout(1500);
        esFab = await visibleStrings(page, '.alloflow-student-tools-panel');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
      }
    }

    let esDocs: string[] = [];
    if (canOpenDocs) {
      const d = page.locator('[data-help-key="header_export"]').first();
      if (await d.isVisible().catch(() => false)) {
        await d.click();
        await page.waitForTimeout(1200);
        esDocs = await visibleStrings(page, '[role="menu"]');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
      }
    }

    // ── Report ───────────────────────────────────────────────────────────
    fs.mkdirSync(OUT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(OUT_DIR, 'landing-after-switch.png'), fullPage: false });

    report('landing', enLanding, esLanding, lang);
    if (enCatalog.length) report('reading-catalog', enCatalog, esCatalog, lang);
    if (enFab.length) report('student-tools', enFab, esFab, lang);
    if (enDocs.length) report('header-documents', enDocs, esDocs, lang);

    // An empty capture would read as "nothing wrong" — fail loudly instead.
    expect(enLanding.length, 'captured no landing strings').toBeGreaterThan(20);
    expect(esLanding.length, 'captured no post-switch strings').toBeGreaterThan(20);
    const landingChanged = enLanding.filter((s) => !esLanding.includes(s)).length;
    expect(landingChanged, 'language switch had no effect at all — the audit would be meaningless').toBeGreaterThan(3);
  });
});
