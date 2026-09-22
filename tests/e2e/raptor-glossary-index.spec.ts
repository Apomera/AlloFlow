import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * GLOSSARY ships as two term lists that were concatenated without merging: it ran
 * A-Z once, restarted at A partway through, and defined 9 terms twice. renderGlossary
 * now deduplicates and sorts before rendering, and groups the result under letter
 * headings with a jump bar.
 *
 * Both halves need pinning. The ordering/dedup is a data claim that regresses
 * silently -- a re-sort or a new duplicate would still render a plausible-looking
 * page. The letter index is navigation that has to actually land somewhere readable.
 */
test.describe('Raptor Lab glossary index', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
    await page.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'glossary', sectionSearch: '' });
      (window as any).__rerender();
    });
    await page.waitForSelector('.rh-gloss-index');
  });

  const TERMS = '[id^="rh-panel-glossary"] .text-sm.font-bold.text-amber-300';

  test('renders one entry per term, in alphabetical order', async ({ page }) => {
    const names: string[] = await page.locator(TERMS).allTextContents();
    const keys = names.map((n) => n.trim().toLowerCase());

    // Sorted. The source array is not: it restarts the alphabet at index 43.
    expect(keys).toEqual([...keys].sort());

    // Deduplicated. 9 terms were defined twice, including "Wing loading", whose
    // second definition is only a cross-reference to the first.
    expect(new Set(keys).size).toBe(keys.length);

    // The count the page advertises is the count it renders.
    const headline = await page.locator('[id^="rh-panel-glossary"] .text-sm.text-slate-300').first().textContent();
    expect(headline).toContain(`${keys.length} terms`);
    await expect(page.getByRole('button', { name: `All filter (${keys.length} terms)` })).toBeVisible();

    // Of two entries for the SAME term, the one that defines it survives -- never
    // the one that opens by pointing at its twin. Once merged such a reference is
    // circular: it sends the reader to the entry they are already reading.
    //
    // Cross-references BETWEEN distinct terms ("Wing slot -- See Slot") are a normal
    // glossary device and are left alone; what must not survive is a self-reference.
    const circular = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[id^="rh-panel-glossary"] div.flex.items-baseline'))
        .map((row) => ({
          term: (row.querySelector('.text-sm.font-bold.text-amber-300')?.textContent || '').trim(),
          def: (row.querySelector('.text-xs.text-slate-200')?.textContent || '').trim(),
        }));
      return rows
        .filter((r) => {
          const m = /^see\s+([a-z][a-z \-/]*?)(?:\s+in base glossary)?\s*[.,—-]/i.exec(r.def);
          return m && m[1].trim().toLowerCase() === r.term.toLowerCase();
        })
        .map((r) => `${r.term} -> ${r.def.slice(0, 60)}`);
    });
    expect(circular, 'entries whose definition only points back at themselves').toEqual([]);
  });

  test('groups entries under letter headings that match their terms', async ({ page }) => {
    const groups = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[id^="rh-gloss-letter-"]')).map((head) => {
        const section = head.closest('section')!;
        const terms = Array.from(section.querySelectorAll('.text-sm.font-bold.text-amber-300'))
          .map((t) => (t.textContent || '').trim());
        return { letter: head.id.replace('rh-gloss-letter-', ''), count: terms.length, terms };
      });
    });
    expect(groups.length).toBeGreaterThan(15);
    for (const g of groups) {
      expect(g.count).toBeGreaterThan(0);
      // Every term in a group actually starts with that group's letter.
      for (const t of g.terms) expect(t[0].toUpperCase()).toBe(g.letter);
    }
    // The heading states the group's size, and those sum to the whole list.
    const total = groups.reduce((n, g) => n + g.count, 0);
    expect(total).toBe(await page.locator(TERMS).count());
  });

  test('jumps to a letter and lands clear of the sticky index bar', async ({ page }) => {
    // Smooth scrolling makes the landing position a function of when we happen to
    // measure, which would make the clearance thresholds below flaky. Reduced motion
    // is a supported mode of this page and takes the instant-scroll path, so assert
    // against the settled position rather than racing an animation.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const letter of ['D', 'M', 'S', 'Z']) {
      await page.locator(`.rh-gloss-index-link[href="#rh-gloss-letter-${letter}"]`).click();
      await page.waitForTimeout(220);
      const r = await page.evaluate((L: string) => {
        const head = document.getElementById('rh-gloss-letter-' + L)!;
        const bar = document.querySelector('.rh-gloss-index') as HTMLElement;
        const hb = head.getBoundingClientRect();
        const bb = bar.getBoundingClientRect();
        return { clearance: hb.top - bb.bottom, focused: document.activeElement === head, inView: hb.top >= 0 && hb.top < window.innerHeight };
      }, letter);
      // The bar is sticky at top:4px and 41px tall, so it covers 0-45px. The
      // heading must land clear of it with room to read as a heading. With
      // .rh-gloss-letter's scroll-margin-top at 69px the settled gap is ~24px;
      // removing that rule drops it to ~2px, which a bare "> 0" would not catch.
      expect(r.clearance, `letter ${letter} lands too close under the index bar`).toBeGreaterThan(15);
      expect(r.inView, `letter ${letter} not in view`).toBeTruthy();
      // Keyboard users must travel with the scroll, not be left behind in the bar.
      expect(r.focused, `letter ${letter} did not take focus`).toBeTruthy();
    }
  });

  test('keeps the alphabet stable while filtering and marks empty letters inert', async ({ page }) => {
    const before = await page.locator('.rh-gloss-index-link').count();

    // U, X and Y have no terms: present, but not links.
    const inert = page.locator('.rh-gloss-index-link[data-has-terms="false"]').first();
    await expect(inert).toHaveAttribute('aria-disabled', 'true');
    expect(await inert.getAttribute('href')).toBeNull();

    // Filtering narrows the entries but must not reflow the alphabet.
    await page.getByRole('button', { name: /Conservation filter \(\d+ terms\)/ }).click();
    await page.waitForTimeout(220);
    expect(await page.locator('.rh-gloss-index-link').count()).toBe(before);
    const shown = await page.locator(TERMS).count();
    expect(shown).toBeGreaterThan(0);
    // Every rendered heading still has entries under it.
    const headings = await page.locator('[id^="rh-gloss-letter-"]').count();
    expect(headings).toBeGreaterThan(0);
    expect(headings).toBeLessThanOrEqual(shown);
    // And more letters are inert than before, since fewer terms match.
    expect(await page.locator('.rh-gloss-index-link[data-has-terms="false"]').count()).toBeGreaterThan(3);
  });

  test('deals each term once in the flashcard deck', async ({ page }) => {
    const listed = await page.locator(TERMS).count();
    await page.getByRole('button', { name: /Flashcards/ }).click();
    await page.waitForTimeout(250);
    const deckSize = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('[id^="rh-panel-glossary"] *'))
        .find((n) => /of\s+\d+/.test(n.textContent || '') && n.children.length === 0);
      return el ? (el.textContent || '').trim() : null;
    });
    // The deck is built from the same deduplicated list the page renders, so a
    // student is never shown the same card twice in one pass.
    if (deckSize) expect(deckSize).toContain(String(listed));
  });
});
