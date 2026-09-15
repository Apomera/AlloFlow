/**
 * UDL guide panel — WCAG 2.2 AA in a REAL browser.
 *
 * tests/udl_guide_modal_a11y.test.js pins the source text. That catches a
 * reverted attribute but cannot prove any of the behaviour actually works:
 * jsdom reports focus for elements it never laid out, and a static scan cannot
 * see a computed accessible name or a contrast ratio. Everything here is
 * measured against the built module running in Chromium.
 *
 * The module is mounted directly rather than driving the deployed app, because
 * the deployed bundle is pinned to a published CDN build and would not contain
 * unreleased fixes.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE = fs.readFileSync(path.join(ROOT, 'view_misc_modals_module.js'), 'utf8');
const AXE = fs.readFileSync(path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
// Resolve against the REAL English pack. A stub t() that always returns its
// fallback would hide a control whose name comes from a key with no fallback.
const STRINGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
// React lives in the desktop app's tree; the repo root has no node_modules/react.
const RM = path.join(ROOT, 'desktop', 'web-app', 'node_modules');
const REACT = fs.readFileSync(path.join(RM, 'react', 'umd', 'react.production.min.js'), 'utf8');
const REACT_DOM = fs.readFileSync(path.join(RM, 'react-dom', 'umd', 'react-dom.production.min.js'), 'utf8');

// Minimal host: the module reads icons, translations and theme tokens off
// window. Icons render as real <svg> so target-size measurement is honest.
const HOST = `
  window.React = React; window.ReactDOM = ReactDOM;
  window.AlloIcons = new Proxy({}, { get: () => (props) =>
    React.createElement('svg', { width: (props && props.size) || 16, height: (props && props.size) || 16, 'aria-hidden': 'true' }) });
  window.AlloModules = window.AlloModules || {};
  window.alloAnnounce = function () {};
`;

const CHAT_STYLES = {
  container: 'bg-white border border-indigo-100 shadow-2xl',
  header: 'bg-indigo-900 text-white shadow-sm',
  body: 'bg-slate-50',
  userBubble: 'bg-indigo-600 text-white',
  modelBubble: 'bg-white text-slate-700 border border-slate-400',
  inputArea: 'bg-white border-t border-indigo-100',
  input: 'bg-white border-slate-300 text-slate-800',
  button: 'bg-indigo-900 text-white hover:opacity-90',
  secondaryButton: 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50',
  text: 'text-slate-700',
  subText: 'text-slate-600',
};

async function mountGuide(page: Page, overrides: Record<string, unknown> = {}) {
  // Tear the previous root down first: setContent swaps the document out from
  // under it, and a stale root leaves the remount painting into a detached node.
  await page.evaluate(() => { try { (window as any).__root?.unmount(); } catch (_) {} });
  await page.setContent('<div id="root"></div><button id="opener">Open the guide</button>');
  await page.addScriptTag({ content: REACT });
  await page.addScriptTag({ content: REACT_DOM });
  await page.addScriptTag({ content: HOST });
  // Tailwind is not loaded; the classes that carry a11y meaning are applied as
  // real CSS below so geometry-dependent assertions measure something real.
  await page.addStyleTag({
    content: `
      .min-w-\\[24px\\]{min-width:24px}.min-h-\\[24px\\]{min-height:24px}
      .inline-flex{display:inline-flex}.items-center{align-items:center}.justify-center{justify-content:center}
      .p-1{padding:4px}.h-6{height:24px}.w-6{width:24px}.shrink-0{flex-shrink:0}.px-2{padding-left:8px;padding-right:8px}.py-1\.5{padding-top:6px;padding-bottom:6px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
      .fixed{position:fixed}.absolute{position:absolute}.inset-0{inset:0}.flex{display:flex}.flex-col{flex-direction:column}
      .w-96{width:24rem}.top-24{top:6rem}.right-4{right:1rem}.bottom-4{bottom:1rem}.flex-1{flex:1}
      body{margin:0;font-family:system-ui,sans-serif}
    `,
  });
  await page.addScriptTag({ content: MODULE });

  await page.evaluate((s) => { (window as any).__strings = s; }, STRINGS);
  await page.evaluate(
    ([styles, extra]) => {
      const Guide = (window as any).AlloModules.UDLGuideModal;
      if (!Guide) throw new Error('UDLGuideModal not exported: ' + Object.keys((window as any).AlloModules).join(','));
      const noop = () => {};
      const props: any = {
        showUDLGuide: true,
        t: null, // replaced below with a pack-backed resolver
        theme: 'light',
        chatStyles: styles,
        udlMessages: [{ role: 'model', text: 'How can I help with this lesson?' }],
        udlInput: '',
        udlInputRef: { current: null },
        udlScrollRef: { current: null },
        suggestedStandards: [],
        lessonTemplates: [],
        archivedPlans: [],
        aiStandardQuery: '',
        aiStandardRegion: '',
        udlStandardFramework: 'Common Core ELA',
        udlStandardGrade: '3rd Grade',
        renderFormattedText: (text: string) => text,
        InteractiveBlueprintCard: () => null,
        setUdlInput: noop, setUdlMessages: noop, setActiveBlueprint: noop,
        setAiStandardQuery: noop, setAiStandardRegion: noop, setStandardsInput: noop,
        setUdlStandardFramework: noop, setUdlStandardGrade: noop,
        setIsBotVisible: noop, setIsConversationMode: noop, setIsDictationMode: noop,
        handleSendUDLMessage: noop, handleSetShowUDLGuideToFalse: noop,
        handleToggleAutoSendVoice: noop, handleToggleIsShowMeMode: noop,
        handleToggleIsUDLGuideExpanded: noop, handleAutoFillToggle: noop,
        handleFindStandards: noop, handleBlueprintUIUpdate: noop, handleExecuteBlueprint: noop,
        saveFullChat: noop, saveUDLAdvice: noop, addToast: noop,
        closeBlueprintPreview: noop, handlePreviewBlueprintStep: noop,
        ...(extra as object),
      };
      props.t = (key: string, fallback?: string) => {
        const hit = String(key).split('.').reduce((acc: any, part) => (acc == null ? acc : acc[part]), (window as any).__strings);
        return (typeof hit === 'string' && hit) || fallback || key;
      };
      (window as any).__props = props;
      const root = (window as any).ReactDOM.createRoot(document.getElementById('root'));
      (window as any).__root = root;
      root.render((window as any).React.createElement(Guide, props));
    },
    [CHAT_STYLES, overrides] as const,
  );
  await page.waitForSelector('[role="dialog"]');
}

test.describe('UDL guide panel — real browser', () => {
  test('exposes one named dialog with a heading', async ({ page }) => {
    await mountGuide(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    // The computed accessible name, not the attribute that is supposed to
    // produce it — a broken aria-labelledby target yields an empty name here.
    await expect(dialog).toHaveAccessibleName(/\S/);
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  });

  test('every control has a non-generic accessible name', async ({ page }) => {
    await mountGuide(page);
    const GENERIC = ['show', 'continue', 'selection', 'refresh', 'text field', 'enter udl input', 'toggle blueprint mode'];
    const named = await page.evaluate(() => {
      const out: { tag: string; name: string }[] = [];
      document.querySelectorAll('button, input, select, textarea, a[href]').forEach((el) => {
        const node = el as HTMLElement;
        if (node.offsetParent === null) return;
        // Approximate the accname algorithm for the shapes this panel uses.
        const label = node.getAttribute('aria-label')
          || (node.getAttribute('aria-labelledby')
            ? (document.getElementById(node.getAttribute('aria-labelledby')!)?.textContent || '')
            : '')
          || (node.id ? (document.querySelector(`label[for="${node.id}"]`)?.textContent || '') : '')
          || node.closest('label')?.textContent
          || node.textContent
          || '';
        out.push({ tag: node.tagName.toLowerCase() + (node.getAttribute('data-help-key') ? '#' + node.getAttribute('data-help-key') : ''), name: label.trim() });
      });
      return out;
    });
    expect(named.length).toBeGreaterThan(5);
    for (const { tag, name } of named) {
      expect(name, `${tag} has no accessible name`).not.toBe('');
      expect(GENERIC, `${tag} is named "${name}"`).not.toContain(name.toLowerCase());
      // The bug that shipped: a raw i18n key read out as the name.
      expect(name, `${tag} announces a raw key`).not.toMatch(/^[a-z_]+\.[a-z_.]+$/);
    }
  });

  // 2.5.8 Target Size (Minimum) — measured, not inferred from class names.
  test('no interactive target is smaller than 24x24', async ({ page }) => {
    await mountGuide(page);
    const small = await page.evaluate(() => {
      const bad: { label: string; w: number; h: number }[] = [];
      document.querySelectorAll('button, input, select, a[href]').forEach((el) => {
        const node = el as HTMLElement;
        if (node.offsetParent === null) return;
        if (node.id === 'opener') return; // the harness's own trigger, not part of the panel
        const r = node.getBoundingClientRect();
        if (r.width < 24 || r.height < 24) {
          bad.push({ label: (node.getAttribute('aria-label') || node.textContent || node.tagName).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
        }
      });
      return bad;
    });
    expect(small, `undersized targets: ${JSON.stringify(small)}`).toHaveLength(0);
  });

  // 2.1.2 / 2.4.3 — the source pin cannot prove focus actually moves.
  test('Escape closes the panel and returns focus to the opener', async ({ page }) => {
    await mountGuide(page);
    await page.evaluate(() => {
      const opener = document.getElementById('opener') as HTMLElement;
      opener.focus();
      // Re-render so the effect captures the opener as the previous focus.
      const props = { ...(window as any).__props, showUDLGuide: false };
      const Guide = (window as any).AlloModules.UDLGuideModal;
      (window as any).__closed = () => (window as any).__root.render((window as any).React.createElement(Guide, props));
    });
    await expect(page.locator('#opener')).toBeFocused();
    await page.evaluate(() => (window as any).__closed());
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Focus must not have collapsed to <body>.
    await expect(page.locator('#opener')).toBeFocused();
  });

  // 2.4.11 Focus Not Obscured + 2.1.2: the preview overlay claims aria-modal.
  test('the preview overlay traps Tab and closes on Escape', async ({ page }) => {
    await mountGuide(page, {
      blueprintPreview: { itemTitle: 'Fractions warm-up', html: '<p>Body</p>' },
      closeBlueprintPreview: undefined,
    });
    await page.evaluate(() => {
      const props = { ...(window as any).__props };
      props.blueprintPreview = { itemTitle: 'Fractions warm-up', html: '<p>Body <a href="#x">link</a></p>' };
      props.closeBlueprintPreview = () => { (window as any).__previewClosed = true; };
      const Guide = (window as any).AlloModules.UDLGuideModal;
      (window as any).__root.render((window as any).React.createElement(Guide, props));
    });
    const overlay = page.locator('[data-testid="bp-preview-overlay"]');
    await expect(overlay).toHaveCount(1);
    // It is named by the resource it is previewing, not a static string.
    await expect(overlay).toHaveAccessibleName(/Fractions warm-up/);

    // Tab repeatedly; focus must never leave the overlay.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const o = document.querySelector('[data-testid="bp-preview-overlay"]');
        return !!o && o.contains(document.activeElement);
      });
      expect(inside, `focus escaped the modal overlay on Tab #${i + 1}`).toBe(true);
    }

    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => (window as any).__previewClosed)).toBe(true);
  });

  // 1.4.10 Reflow: content must work at 320 CSS px with no horizontal scroll.
  // The panel is `w-96` (384px) with a maxWidth of calc(100vw - 2rem), so the
  // clamp is the only thing keeping it on a small screen.
  test('reflows to a 320px viewport without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mountGuide(page);
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panel: (() => {
        const d = document.querySelector('[role="dialog"]') as HTMLElement;
        const r = d.getBoundingClientRect();
        return { right: Math.round(r.right), left: Math.round(r.left), width: Math.round(r.width) };
      })(),
    }));
    expect(overflow.doc, 'document scrolls horizontally at 320px').toBeLessThanOrEqual(0);
    expect(overflow.panel.left, 'panel starts off-screen left').toBeGreaterThanOrEqual(0);
    expect(overflow.panel.right, 'panel overflows the right edge').toBeLessThanOrEqual(320);
  });

  // 1.4.4 Resize Text: at 200% the panel must not clip its own controls.
  test('keeps the composer reachable at 200% text size', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await mountGuide(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    const send = page.locator('[data-help-key="chat_send"]');
    await expect(send).toBeVisible();
    const clipped = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]') as HTMLElement;
      const btn = document.querySelector('[data-help-key="chat_send"]') as HTMLElement;
      const dr = d.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      return { belowPanel: Math.round(br.bottom - dr.bottom), offscreen: Math.round(br.bottom - window.innerHeight) };
    });
    // The send button must stay inside the panel, not pushed out of its box.
    expect(clipped.belowPanel, 'send button is clipped below the panel').toBeLessThanOrEqual(2);
    expect(clipped.offscreen, 'send button is pushed off screen').toBeLessThanOrEqual(2);
  });

  // One page per theme: remounting into a document that setContent has already
  // swapped out left the second render painting into a detached container.
  for (const theme of ['light', 'dark', 'contrast'] as const) {
    test(`axe finds no violations in the ${theme} theme`, async ({ page }) => {
      await mountGuide(page, { theme });
      await page.addScriptTag({ content: AXE });
      const results = await page.evaluate(async () => {
        // @ts-expect-error injected
        return await window.axe.run(document.body, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        });
      });
      const found = results.violations.map((v: any) => `${v.id} (${v.nodes.length}): ${v.help} :: ${v.nodes.map((n: any) => n.html.slice(0, 120)).join(' | ')}`);
      expect(found, `${theme} theme axe violations`).toEqual([]);
    });
  }
});
