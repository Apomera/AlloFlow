import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared responsive invariants for the mobile/tablet suite.
 *
 * Every check returns *named offenders*, not just a boolean. A failing
 * assertion that says "3 elements overflow" is unactionable; one that says
 * `button.allo-tool-tile "Solar System" extends to x=447 (viewport 390)` tells
 * you which rule to fix.
 *
 * The `describe()` helper is duplicated inside each page function on purpose:
 * page.evaluate serialises its callback, so it cannot close over module scope,
 * and building it from a string would trip the repo's check_eval gate.
 */

export const TAP_TARGET_MIN = 44; // WCAG 2.5.5 AAA / Apple HIG. 24px is the AA floor.
const OVERFLOW_TOLERANCE = 2; // sub-pixel rounding + scrollbar gutters

export interface Offender {
  desc: string;
  detail: string;
}

/**
 * Nothing may extend past the right edge of the viewport.
 *
 * This is the single highest-value mobile check: horizontal overflow is what
 * produces the "page scrolls sideways and the layout is broken" bug. We walk
 * the tree rather than trusting documentElement.scrollWidth alone, because a
 * clipped ancestor can hide the overflow from the document while still
 * cutting off the child's content.
 */
export async function findHorizontalOverflow(page: Page): Promise<Offender[]> {
  return page.evaluate((tolerance) => {
    const describe = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? '#' + el.id : '';
      const cls = typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
      const label = el.getAttribute('aria-label') || '';
      const text = ((el as HTMLElement).innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const name = label || text;
      return tag + id + cls + (name ? ' "' + name + '"' : '');
    };

    const vw = document.documentElement.clientWidth;
    const out: { desc: string; detail: string }[] = [];
    const flagged = new Set<Element>();

    /**
     * An element wider than the viewport is only a *bug* if it is actually
     * visible past the edge. Decorative blobs (`right-[-10%]` blur circles)
     * and carousel strips routinely extend beyond their container and are
     * clipped by an ancestor's overflow, producing no scroll and no visual
     * defect. Reporting those buries the real findings.
     */
    const clippedByAncestor = (el: Element, right: number): boolean => {
      let node = el.parentElement;
      while (node && node !== document.documentElement) {
        const s = getComputedStyle(node);
        if (s.overflowX !== 'visible') {
          const r = node.getBoundingClientRect();
          if (right > r.right - 1) return true; // ancestor cuts it off
        }
        node = node.parentElement;
      }
      return false;
    };

    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      // Rect first: it is far cheaper than getComputedStyle, and it rejects
      // the overwhelming majority of nodes. Computing style for every element
      // in this app's DOM turned a one-second check into three minutes.
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= vw + tolerance) continue;

      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      // Off-canvas drawers are parked offscreen deliberately.
      if (style.position === 'fixed' && parseFloat(style.left) < -50) continue;
      if (clippedByAncestor(el, rect.right)) continue;

      // Report the outermost offender only: if an ancestor already overflows,
      // this element is a symptom, not the cause.
      let parent: Element | null = el.parentElement;
      let ancestorFlagged = false;
      while (parent && parent !== document.body) {
        if (flagged.has(parent)) { ancestorFlagged = true; break; }
        parent = parent.parentElement;
      }
      flagged.add(el);
      if (ancestorFlagged) continue;

      out.push({
        desc: describe(el),
        detail: `right edge ${Math.round(rect.right)}px > viewport ${vw}px (overflow ${Math.round(rect.right - vw)}px)`,
      });
    }
    return out.slice(0, 15);
  }, OVERFLOW_TOLERANCE);
}

/** The document itself must not scroll sideways. */
export async function findDocumentScroll(page: Page): Promise<{ scrollWidth: number; clientWidth: number } | null> {
  const r = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return r.scrollWidth > r.clientWidth + OVERFLOW_TOLERANCE ? r : null;
}

/**
 * Interactive controls must be big enough to hit with a finger.
 *
 * Scoped to genuinely tappable controls. Inline links inside a paragraph are
 * exempt under WCAG 2.5.8, and enforcing 44px on them would drown the real
 * findings in noise.
 */
export async function findSmallTapTargets(page: Page, min = TAP_TARGET_MIN): Promise<Offender[]> {
  return page.evaluate((minSize) => {
    const describe = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? '#' + el.id : '';
      const cls = typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
      const label = el.getAttribute('aria-label') || '';
      const text = ((el as HTMLElement).innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const name = label || text;
      return tag + id + cls + (name ? ' "' + name + '"' : '');
    };

    const out: { desc: string; detail: string }[] = [];
    const sel = 'button, [role="button"], input:not([type="hidden"]), select, textarea, [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], a[href][class]';

    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') continue;

      // Skip links sitting inline inside a run of prose (WCAG 2.5.8 exception).
      if (el.tagName === 'A') {
        const parent = el.parentElement;
        const parentText = parent ? (parent.innerText || '').trim().length : 0;
        if (parentText > (el.innerText || '').trim().length + 20) continue;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Offscreen (collapsed drawers, inactive tab panels) is not a size bug.
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;

      if (rect.width < minSize || rect.height < minSize) {
        out.push({
          desc: describe(el),
          detail: `${Math.round(rect.width)}x${Math.round(rect.height)}px < ${minSize}x${minSize}px`,
        });
      }
    }
    return out.slice(0, 25);
  }, min);
}

/**
 * An open dialog must fit the viewport, or scroll inside itself.
 *
 * The classic tablet bug is a modal taller than the screen whose action
 * buttons sit below the fold with no way to scroll to them, which makes the
 * dialog impossible to confirm or dismiss.
 */
export async function checkDialogFits(page: Page, dialog: Locator): Promise<Offender[]> {
  return dialog.evaluate((el: HTMLElement) => {
    const out: { desc: string; detail: string }[] = [];
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.width > vw + 2) {
      out.push({ desc: 'dialog width', detail: `${Math.round(rect.width)}px wider than viewport ${vw}px` });
    }
    if (rect.left < -2) {
      out.push({ desc: 'dialog position', detail: `left edge at ${Math.round(rect.left)}px is offscreen` });
    }

    // Taller than the viewport is fine *only* if something can actually scroll.
    if (rect.height > vh + 2) {
      let scrollable = false;
      const walk = (node: HTMLElement): void => {
        const s = getComputedStyle(node);
        if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 2) {
          scrollable = true;
        }
        for (const child of Array.from(node.children)) walk(child as HTMLElement);
      };
      walk(el);
      const bodyScrolls = document.documentElement.scrollHeight > document.documentElement.clientHeight + 2;
      if (!scrollable && !bodyScrolls) {
        out.push({
          desc: 'dialog overflow',
          detail: `${Math.round(rect.height)}px tall vs viewport ${vh}px with no scrollable region — content below the fold is unreachable`,
        });
      }
    }
    return out;
  });
}

/** Text hard-clipped by a fixed-size container (ellipsis is deliberate; truncation is not). */
export async function findClippedText(page: Page): Promise<Offender[]> {
  return page.evaluate(() => {
    const describe = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const cls = typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
      const text = ((el as HTMLElement).innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return tag + cls + (text ? ' "' + text + '"' : '');
    };

    /** The visually-hidden / sr-only pattern, in any of its usual spellings. */
    const isVisuallyHidden = (el: HTMLElement): boolean => {
      const cls = typeof el.className === 'string' ? el.className : '';
      if (/\bsr-only\b|\bvisually-hidden\b|\bscreen-reader\b/.test(cls)) return true;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 4 || rect.height <= 4) return true;
      const s = getComputedStyle(el);
      if (s.clip && s.clip !== 'auto') return true;
      if (s.clipPath && s.clipPath !== 'none') return true;
      return false;
    };

    const out: { desc: string; detail: string }[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      // Cheap structural rejects first; getComputedStyle only for survivors.
      if (el.children.length > 0) continue; // leaf text nodes only
      if (el.scrollWidth <= el.clientWidth + 4) continue;
      const text = (el.innerText || el.textContent || '').trim();
      if (text.length < 3) continue;

      // Screen-reader-only text is *deliberately* clipped to a 1px box, and
      // skip links are hidden until focused. Both are correct accessibility
      // practice, so flagging them as "clipped text" is a false positive.
      if (isVisuallyHidden(el)) continue;

      const style = getComputedStyle(el);
      if (style.overflow !== 'hidden' && style.overflowX !== 'hidden') continue;
      if (style.textOverflow === 'ellipsis') continue; // deliberate truncation
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      out.push({
        desc: describe(el),
        detail: `content ${el.scrollWidth}px clipped to ${el.clientWidth}px, no ellipsis`,
      });
    }
    return out.slice(0, 15);
  });
}

/** Format offenders into a failure message you can act on directly. */
export function report(label: string, offenders: Offender[]): string {
  return [`${offenders.length} ${label}:`, ...offenders.map((o) => `  - ${o.desc} — ${o.detail}`)].join('\n');
}

/** Assert the full layout invariant set for the current screen. */
export async function expectNoLayoutBreakage(page: Page, context: string): Promise<void> {
  const doc = await findDocumentScroll(page);
  expect(doc, `${context}: page scrolls horizontally (${doc?.scrollWidth} > ${doc?.clientWidth})`).toBeNull();

  const overflow = await findHorizontalOverflow(page);
  expect(overflow, `${context}: ${report('elements overflow the viewport', overflow)}`).toEqual([]);
}
