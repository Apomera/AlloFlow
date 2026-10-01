const TEXT_SPACING_CSS = `
  #tool-root,
  #tool-root * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }

  #tool-root p {
    margin-bottom: 2em !important;
  }
`;

// Gate WCAG 2.2 target size before changing layout, then verify that content
// and functionality survive the WCAG 1.4.12 normative spacing overrides in
// the already-rendered 320px fleet fixture. Intentional inner scrollers remain
// allowed; only document-level overflow fails the reflow gate.
export async function auditTextSpacingReflow(page) {
  const targetSize = await auditTargetSize(page);
  if (targetSize.failures.length > 0) {
    throw new Error('WCAG 2.2 SC 2.5.8 target-size findings:\n' + JSON.stringify(targetSize, null, 2));
  }

  await page.addStyleTag({ content: TEXT_SPACING_CSS });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));

  const measureReflow = () => page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders = scrollWidth > clientWidth
      ? [...document.querySelectorAll('#tool-root, #tool-root *')]
          .map((element) => {
            const box = element.getBoundingClientRect();
            const styles = getComputedStyle(element);
            let visibleLeft = box.left;
            let visibleRight = box.right;
            const clippedBy = [];
            let ancestor = element.parentElement;
            while (ancestor && ancestor !== document.documentElement) {
              const ancestorStyles = getComputedStyle(ancestor);
              if (/^(auto|scroll|hidden|clip)$/.test(ancestorStyles.overflowX)) {
                const ancestorBox = ancestor.getBoundingClientRect();
                visibleLeft = Math.max(visibleLeft, ancestorBox.left);
                visibleRight = Math.min(visibleRight, ancestorBox.right);
                clippedBy.push(ancestor.tagName.toLowerCase() + (ancestor.id ? `#${ancestor.id}` : ''));
              }
              ancestor = ancestor.parentElement;
            }
            return {
              element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
              html: element.outerHTML.slice(0, 280),
              left: Math.round(box.left),
              right: Math.round(box.right),
              visibleLeft: Math.round(visibleLeft),
              visibleRight: Math.round(visibleRight),
              width: Math.round(box.width),
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              clippedBy,
              display: styles.display,
              overflowX: styles.overflowX,
              gridTemplateColumns: styles.gridTemplateColumns,
              flexWrap: styles.flexWrap,
              whiteSpace: styles.whiteSpace,
            };
          })
          .filter((item) => item.visibleRight > clientWidth + 1 || item.visibleLeft < -1 ||
            (item.scrollWidth > item.clientWidth + 1 && item.overflowX === 'visible'))
          .sort((a, b) => Math.max(b.visibleRight, b.scrollWidth - b.clientWidth) - Math.max(a.visibleRight, a.scrollWidth - a.clientWidth))
          .slice(0, 8)
      : [];
    return { scrollWidth, clientWidth, offenders };
  });
  const reflow = await measureReflow();

  const textSpacingTargetSize = await auditTargetSize(page);
  if (textSpacingTargetSize.failures.length > 0) {
    throw new Error(
      'WCAG 2.2 SC 2.5.8 text-spacing target-size findings:\n' +
      JSON.stringify(textSpacingTargetSize, null, 2),
    );
  }


  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  const forcedColorsActive = await page.evaluate(
    () => matchMedia('(forced-colors: active)').matches,
  );
  if (!forcedColorsActive) {
    throw new Error('Forced-colors reflow audit did not activate the requested media state.');
  }

  const forcedColorsTargetSize = await auditTargetSize(page);
  if (forcedColorsTargetSize.failures.length > 0) {
    throw new Error(
      'WCAG 2.2 SC 2.5.8 forced-colors target-size findings:\n' +
      JSON.stringify(forcedColorsTargetSize, null, 2),
    );
  }

  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const forcedColorsReflow = await measureReflow();
  if (forcedColorsReflow.scrollWidth > forcedColorsReflow.clientWidth) {
    throw new Error(
      'WCAG 1.4.10/1.4.12 forced-colors reflow findings:\n' +
      JSON.stringify(forcedColorsReflow, null, 2),
    );
  }

  return {
    ...reflow,
    targetSize,
    textSpacingTargetSize,
    forcedColors: { ...forcedColorsReflow, targetSize: forcedColorsTargetSize },
  };
}

const POINTER_TARGET_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
].join(',');

// WCAG 2.2 SC 2.5.8 permits a target smaller than 24 CSS pixels when its
// 24-pixel safety circle does not intersect another target. The probe also
// honors the inline-text and unmodified user-agent-control exceptions, and
// treats an associated label as part of a form control's effective target.
// It intentionally reports diagnostics rather than attempting to infer a fix.
export async function auditTargetSize(page) {
  return page.evaluate((selector) => {
    const ROOT = document.querySelector('#tool-root');
    const MINIMUM = 24;
    const TOLERANCE = 0.5;

    const rectObject = (rect) => ({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });

    const unionRect = (rects) => {
      const left = Math.min(...rects.map((rect) => rect.left));
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      return rectObject({ left, top, right, bottom, width: right - left, height: bottom - top });
    };

    const isVisibleTarget = (element) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      let closedDisclosure = element.closest('details:not([open])');
      while (closedDisclosure) {
        const summary = closedDisclosure.querySelector(':scope > summary');
        if (!summary || (element !== summary && !summary.contains(element))) return false;
        closedDisclosure = closedDisclosure.parentElement
          ? closedDisclosure.parentElement.closest('details:not([open])')
          : null;
      }
      if (element.matches(':disabled, [aria-disabled="true"]')) return false;
      const styles = getComputedStyle(element);
      if (styles.display === 'none' || styles.visibility === 'hidden' || styles.visibility === 'collapse') return false;
      if (styles.pointerEvents === 'none') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > TOLERANCE && rect.height > TOLERANCE;
    };

    const describe = (element) => {
      const tag = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : '';
      const role = element.getAttribute('role');
      const type = element.getAttribute('type');
      const disclosure = element.closest('details');
      const name = element.getAttribute('aria-label') || element.getAttribute('title') ||
        (element.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        selector: tag + id + (role ? `[role="${role}"]` : '') + (type ? `[type="${type}"]` : ''),
        name: name.slice(0, 100),
        html: element.outerHTML.slice(0, 240),
        disclosure: disclosure ? {
          id: disclosure.id || '',
          open: disclosure.open,
          display: getComputedStyle(disclosure).display,
          height: Math.round(disclosure.getBoundingClientRect().height * 10) / 10,
        } : null,
      };
    };

    const isInlineTextException = (element) => {
      const styles = getComputedStyle(element);
      if (!styles.display.startsWith('inline')) return false;
      const parent = element.parentElement;
      if (!parent) return false;
      const hasAdjacentText = [...parent.childNodes].some((node) =>
        node !== element && node.nodeType === Node.TEXT_NODE && /\S/.test(node.textContent || ''));
      const hasInlineSibling = [...parent.children].some((sibling) =>
        sibling !== element && getComputedStyle(sibling).display.startsWith('inline') &&
        /\S/.test(sibling.textContent || ''));
      return hasAdjacentText || hasInlineSibling;
    };

    const isUserAgentControlException = (element) => {
      if (!(element instanceof HTMLInputElement)) return false;
      return (element.type === 'checkbox' || element.type === 'radio') &&
        getComputedStyle(element).appearance !== 'none';
    };

    const clippingContext = (element, rect) => {
      const ancestors = [];
      let fullyVisible = true;
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.documentElement) {
        const styles = getComputedStyle(ancestor);
        const clipsX = /^(auto|scroll|hidden|clip)$/.test(styles.overflowX);
        const clipsY = /^(auto|scroll|hidden|clip)$/.test(styles.overflowY);
        if (clipsX || clipsY) {
          const box = ancestor.getBoundingClientRect();
          const clipLeft = box.left + ancestor.clientLeft;
          const clipTop = box.top + ancestor.clientTop;
          const clipRight = clipLeft + ancestor.clientWidth;
          const clipBottom = clipTop + ancestor.clientHeight;
          if ((clipsX && (rect.left < clipLeft - TOLERANCE || rect.right > clipRight + TOLERANCE)) ||
              (clipsY && (rect.top < clipTop - TOLERANCE || rect.bottom > clipBottom + TOLERANCE))) {
            fullyVisible = false;
          }
          ancestors.push({
            element: ancestor,
            name: ancestor.tagName.toLowerCase() + (ancestor.id ? `#${ancestor.id}` : '') +
              (typeof ancestor.className === 'string' && ancestor.className
                ? '.' + ancestor.className.trim().replace(/\s+/g, '.')
                : ''),
            clipsX,
            clipsY,
          });
        }
        ancestor = ancestor.parentElement;
      }
      return { ancestors, fullyVisible };
    };

    const sharesClippingContext = (first, second) =>
      first.clipping.ancestors.some((clip) =>
        second.clipping.ancestors.some((otherClip) => otherClip.element === clip.element));

    const targets = [...ROOT.querySelectorAll(selector)]
      .filter(isVisibleTarget)
      .map((element) => {
        const ownRect = rectObject(element.getBoundingClientRect());
        const labelRects = element.labels
          ? [...element.labels]
              .filter(isVisibleTarget)
              .map((label) => rectObject(label.getBoundingClientRect()))
          : [];
        const effectiveRect = labelRects.length ? unionRect([ownRect, ...labelRects]) : ownRect;
        return {
          element,
          ownRect,
          effectiveRect,
          clipping: clippingContext(element, effectiveRect),
          hasLabelTarget: labelRects.length > 0,
          inlineText: isInlineTextException(element),
          userAgentControl: isUserAgentControlException(element),
        };
      });

    const isUndersized = (target) =>
      target.effectiveRect.width < MINIMUM - TOLERANCE ||
      target.effectiveRect.height < MINIMUM - TOLERANCE;
    const undersized = targets.filter(isUndersized);
    const exceptions = { inlineText: 0, userAgentControl: 0, associatedLabel: 0, spacing: 0 };
    const failures = [];

    for (const target of undersized) {
      if (target.inlineText) {
        exceptions.inlineText += 1;
        continue;
      }
      if (target.userAgentControl) {
        exceptions.userAgentControl += 1;
        continue;
      }

      const collisions = [];
      for (const other of targets) {
        if (other === target) continue;
        if ((!target.clipping.fullyVisible || !other.clipping.fullyVisible) &&
            !sharesClippingContext(target, other)) continue;

        let clearance;
        if (isUndersized(other)) {
          // Each undersized target receives a centered 24px-diameter circle.
          clearance = Math.hypot(
            target.effectiveRect.centerX - other.effectiveRect.centerX,
            target.effectiveRect.centerY - other.effectiveRect.centerY,
          ) - MINIMUM / 2;
        } else {
          // A sufficiently large neighboring target keeps its actual shape.
          const closestX = Math.max(other.effectiveRect.left,
            Math.min(target.effectiveRect.centerX, other.effectiveRect.right));
          const closestY = Math.max(other.effectiveRect.top,
            Math.min(target.effectiveRect.centerY, other.effectiveRect.bottom));
          clearance = Math.hypot(
            target.effectiveRect.centerX - closestX,
            target.effectiveRect.centerY - closestY,
          );
        }

        if (clearance < MINIMUM / 2 - TOLERANCE) {
          collisions.push({
            ...describe(other.element),
            clearance: Math.round(clearance * 10) / 10,
            left: Math.round(other.effectiveRect.left * 10) / 10,
            top: Math.round(other.effectiveRect.top * 10) / 10,
            right: Math.round(other.effectiveRect.right * 10) / 10,
            bottom: Math.round(other.effectiveRect.bottom * 10) / 10,
            width: Math.round(other.effectiveRect.width * 10) / 10,
            height: Math.round(other.effectiveRect.height * 10) / 10,
            fullyVisibleWithinClips: other.clipping.fullyVisible,
            clippingAncestors: other.clipping.ancestors.map((clip) => clip.name),
          });
        }
      }

      if (collisions.length === 0) {
        exceptions.spacing += 1;
        continue;
      }

      failures.push({
        ...describe(target.element),
        left: Math.round(target.effectiveRect.left * 10) / 10,
        top: Math.round(target.effectiveRect.top * 10) / 10,
        right: Math.round(target.effectiveRect.right * 10) / 10,
        bottom: Math.round(target.effectiveRect.bottom * 10) / 10,
        width: Math.round(target.effectiveRect.width * 10) / 10,
        height: Math.round(target.effectiveRect.height * 10) / 10,
        ownWidth: Math.round(target.ownRect.width * 10) / 10,
        ownHeight: Math.round(target.ownRect.height * 10) / 10,
        fullyVisibleWithinClips: target.clipping.fullyVisible,
        clippingAncestors: target.clipping.ancestors.map((clip) => clip.name),
        hasLabelTarget: target.hasLabelTarget,
        collisions: collisions.slice(0, 6),
      });
    }

    exceptions.associatedLabel = targets.filter((target) =>
      target.hasLabelTarget &&
      (target.ownRect.width < MINIMUM - TOLERANCE || target.ownRect.height < MINIMUM - TOLERANCE) &&
      !isUndersized(target)).length;

    return {
      checked: targets.length,
      undersized: undersized.length,
      exceptions,
      failures: failures.slice(0, 12),
    };
  }, POINTER_TARGET_SELECTOR);
}
