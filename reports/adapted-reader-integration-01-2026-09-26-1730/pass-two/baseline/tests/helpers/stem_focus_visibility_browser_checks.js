const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
].join(',');

const VISUAL_STYLE_KEYS = [
  'outlineColor', 'outlineStyle', 'outlineWidth', 'outlineOffset',
  'boxShadow', 'backgroundColor', 'color', 'opacity', 'filter', 'transform',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'textDecorationColor', 'textDecorationLine', 'textDecorationStyle',
];

// Exercise the actual sequential keyboard order so Chromium applies its
// :focus-visible heuristic exactly as a keyboard user experiences it. Each
// focused node and its first three ancestors are compared with an unfocused
// baseline, which also recognizes indicators drawn with :focus-within.
// Geometry is intersected with viewport and author-created clipping ancestors.
// Hit testing remains advisory because transparent/canvas/tutorial layers can
// intercept elementFromPoint without visually obscuring the focus indicator.
export async function auditFocusVisibility(page, { maxSteps = 400, onVisit } = {}) {
  const setup = await page.evaluate(({ selector, styleKeys }) => {
    const root = document.querySelector('#tool-root');
    if (!root) throw new Error('Focus audit requires #tool-root.');

    const elementPath = (element) => {
      if (element === root) return '#tool-root';
      if (element.id) {
        const idSelector = '#' + CSS.escape(element.id);
        try {
          if (root.querySelectorAll(idSelector).length === 1) return idSelector;
        } catch (_) {}
      }
      const parts = [];
      let node = element;
      while (node && node !== root) {
        const parent = node.parentElement;
        if (!parent) break;
        const index = [...parent.children].indexOf(node) + 1;
        parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + index + ')');
        node = parent;
      }
      return '#tool-root>' + parts.join('>');
    };

    const styleSnapshot = (element, pseudo) => {
      const styles = getComputedStyle(element, pseudo || null);
      const snapshot = { content: styles.content };
      for (const key of styleKeys) snapshot[key] = styles[key];
      return snapshot;
    };

    const nodeSnapshot = (element) => ({
      self: styleSnapshot(element, null),
      before: styleSnapshot(element, '::before'),
      after: styleSnapshot(element, '::after'),
    });

    const layerSnapshots = (element) => {
      const layers = [];
      let node = element;
      let depth = 0;
      while (node && root.contains(node) && depth < 4) {
        layers.push({ path: elementPath(node), styles: nodeSnapshot(node) });
        if (node === root) break;
        node = node.parentElement;
        depth += 1;
      }
      const adjacentProxy = element.nextElementSibling;
      if (adjacentProxy && element.parentElement instanceof HTMLLabelElement &&
          element.parentElement.contains(adjacentProxy)) {
        layers.push({ path: elementPath(adjacentProxy), styles: nodeSnapshot(adjacentProxy) });
      }
      return layers;
    };

    const isRendered = (element, { allowImplicitScroll = false } = {}) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
      if (element.matches(':disabled') || (!allowImplicitScroll && element.tabIndex < 0)) return false;
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      let closedDisclosure = element.closest('details:not([open])');
      while (closedDisclosure) {
        const summary = closedDisclosure.querySelector(':scope > summary');
        if (!summary || (element !== summary && !summary.contains(element))) return false;
        closedDisclosure = closedDisclosure.parentElement
          ? closedDisclosure.parentElement.closest('details:not([open])')
          : null;
      }
      let node = element;
      while (node && root.contains(node)) {
        const styles = getComputedStyle(node);
        if (styles.display === 'none' || styles.visibility === 'hidden' ||
            styles.visibility === 'collapse' ||
            (node !== element && Number(styles.opacity) === 0)) return false;
        if (node === root) break;
        node = node.parentElement;
      }
      return true;
    };

    const renderedCandidates = [...root.querySelectorAll(selector)].filter((element) =>
      isRendered(element, { allowImplicitScroll: true }));
    const explicitCandidates = renderedCandidates.filter((element) => isRendered(element));
    // Chromium makes an overflow:auto/scroll container a sequential Tab stop
    // when it has no sequentially focusable descendants, even though its DOM
    // tabIndex remains -1. Include those implicit stops so zero-size scrollers
    // and their native focus indicators cannot escape the audit baseline.
    const scrollableElements = [...root.querySelectorAll('*')].filter((element) => {
      if (!isRendered(element, { allowImplicitScroll: true }) || element.hasAttribute('tabindex')) return false;
      const styles = getComputedStyle(element);
      const scrollsX = /^(auto|scroll)$/.test(styles.overflowX) &&
        element.scrollWidth > element.clientWidth + 1;
      const scrollsY = /^(auto|scroll)$/.test(styles.overflowY) &&
        element.scrollHeight > element.clientHeight + 1;
      return scrollsX || scrollsY;
    });
    const implicitScrollers = scrollableElements.filter((element) => {
      const hasExplicitStop = explicitCandidates.some((candidate) =>
        candidate !== element && element.contains(candidate));
      const hasNestedScroller = scrollableElements.some((candidate) =>
        candidate !== element && element.contains(candidate));
      return !hasExplicitStop && !hasNestedScroller;
    });
    const candidates = [...new Set([...explicitCandidates, ...implicitScrollers])];
    const radiosByGroup = new Map();
    for (const radio of candidates.filter((element) =>
      element instanceof HTMLInputElement && element.type === 'radio' && element.name)) {
      const formKey = radio.form ? elementPath(radio.form) : 'no-form';
      const key = formKey + '::' + radio.name;
      if (!radiosByGroup.has(key)) radiosByGroup.set(key, []);
      radiosByGroup.get(key).push(radio);
    }
    const expectedRadio = new Set();
    for (const radios of radiosByGroup.values()) {
      expectedRadio.add(radios.find((radio) => radio.checked) || radios[0]);
    }
    const normalized = candidates.filter((element) => {
      if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) return true;
      return expectedRadio.has(element);
    });

    const baselines = {};
    const descriptions = {};
    // Snapshot every rendered candidate, including controls whose effective
    // tabIndex is temporarily negative, because native radio traversal can
    // expose a different group member after the audit begins.
    const baselineCandidates = [...new Set([...renderedCandidates, ...implicitScrollers])];
    for (const element of baselineCandidates) {
      const path = elementPath(element);
      baselines[path] = layerSnapshots(element);
      const label = element.labels && element.labels.length
        ? [...element.labels].map((item) => item.textContent || '').join(' ')
        : '';
      descriptions[path] = {
        selector: element.tagName.toLowerCase() + (element.id ? '#' + element.id : ''),
        name: (element.getAttribute('aria-label') || element.getAttribute('title') || label ||
          element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        html: element.outerHTML.slice(0, 280),
      };
    }

    const bodyTabIndex = document.body.getAttribute('tabindex');
    const scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    document.body.setAttribute('tabindex', '-1');
    document.body.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    window.__alloFocusAudit = { baselines, descriptions, bodyTabIndex, scrollBehavior };

    return { candidateCount: normalized.length, paths: normalized.map(elementPath), descriptions };
  }, { selector: FOCUSABLE_SELECTOR, styleKeys: VISUAL_STYLE_KEYS });

  const seen = new Set();
  const visits = [];
  const failures = [];
  const warnings = [];
  let outsideCount = 0;
  const stepLimit = Math.min(maxSteps, setup.candidateCount + 12);

  for (let step = 0; step < stepLimit; step += 1) {
    await page.keyboard.press('Tab');
    const result = await page.evaluate((styleKeys) => {
      const root = document.querySelector('#tool-root');
      const active = document.activeElement;
      if (!root || !active || !root.contains(active)) return { inRoot: false };

      // Sample the settled focus state. Utility classes commonly transition
      // outline/ring properties from a transparent first frame; reading that
      // frame would incorrectly report a missing indicator. Only finite
      // animations on the target and focus-within ancestors are advanced.
      let animationNode = active;
      let animationDepth = 0;
      while (animationNode && root.contains(animationNode) && animationDepth < 4) {
        for (const animation of animationNode.getAnimations()) {
          const timing = animation.effect && animation.effect.getComputedTiming();
          if (timing && Number.isFinite(timing.endTime)) {
            try { animation.finish(); } catch (_) {}
          }
        }
        if (animationNode === root) break;
        animationNode = animationNode.parentElement;
        animationDepth += 1;
      }

      const elementPath = (element) => {
        if (element === root) return '#tool-root';
      if (element.id) {
        const idSelector = '#' + CSS.escape(element.id);
        try {
          if (root.querySelectorAll(idSelector).length === 1) return idSelector;
        } catch (_) {}
      }
        const parts = [];
        let node = element;
        while (node && node !== root) {
          const parent = node.parentElement;
          if (!parent) break;
          const index = [...parent.children].indexOf(node) + 1;
          parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + index + ')');
          node = parent;
        }
        return '#tool-root>' + parts.join('>');
      };

      const styleSnapshot = (element, pseudo) => {
        const styles = getComputedStyle(element, pseudo || null);
        const snapshot = { content: styles.content };
        for (const key of styleKeys) snapshot[key] = styles[key];
        return snapshot;
      };
      const nodeSnapshot = (element) => ({
        self: styleSnapshot(element, null),
        before: styleSnapshot(element, '::before'),
        after: styleSnapshot(element, '::after'),
      });
      const layers = [];
      let layerNode = active;
      let depth = 0;
      while (layerNode && root.contains(layerNode) && depth < 4) {
        layers.push({ path: elementPath(layerNode), styles: nodeSnapshot(layerNode) });
        if (layerNode === root) break;
        layerNode = layerNode.parentElement;
        depth += 1;
      }
      const adjacentProxy = active.nextElementSibling;
      if (adjacentProxy && active.parentElement instanceof HTMLLabelElement &&
          active.parentElement.contains(adjacentProxy)) {
        layers.push({ path: elementPath(adjacentProxy), styles: nodeSnapshot(adjacentProxy) });
      }

      const path = elementPath(active);
      const baseline = window.__alloFocusAudit && window.__alloFocusAudit.baselines[path];
      const baselineByPath = new Map((baseline || []).map((layer) => [layer.path, layer.styles]));
      const changes = [];
      for (const layer of layers) {
        const prior = baselineByPath.get(layer.path);
        if (!prior) continue;
        for (const part of ['self', 'before', 'after']) {
          for (const key of ['content', ...styleKeys]) {
            if (prior[part][key] !== layer.styles[part][key]) {
              changes.push({ layer: layer.path, part, property: key,
                before: prior[part][key], after: layer.styles[part][key] });
            }
          }
        }
      }

      const rect = active.getBoundingClientRect();
      let visibleLeft = Math.max(0, rect.left);
      let visibleTop = Math.max(0, rect.top);
      let visibleRight = Math.min(innerWidth, rect.right);
      let visibleBottom = Math.min(innerHeight, rect.bottom);
      const clippedBy = [];
      let ancestor = active.parentElement;
      while (ancestor && ancestor !== document.documentElement) {
        const styles = getComputedStyle(ancestor);
        const clipsX = /^(auto|scroll|hidden|clip)$/.test(styles.overflowX);
        const clipsY = /^(auto|scroll|hidden|clip)$/.test(styles.overflowY);
        // A closed details element may report a zero-height content box even
        // though its direct summary is visibly rendered and focusable. The
        // summary is the disclosure's rendered exception, not clipped content.
        const closedSummary = ancestor instanceof HTMLDetailsElement && !ancestor.open
          ? ancestor.querySelector(':scope > summary') : null;
        const isVisibleClosedSummary = !!closedSummary &&
          (active === closedSummary || closedSummary.contains(active));
        if ((clipsX || clipsY) && !isVisibleClosedSummary) {
          const box = ancestor.getBoundingClientRect();
          const left = box.left + ancestor.clientLeft;
          const top = box.top + ancestor.clientTop;
          if (clipsX) {
            visibleLeft = Math.max(visibleLeft, left);
            visibleRight = Math.min(visibleRight, left + ancestor.clientWidth);
          }
          if (clipsY) {
            visibleTop = Math.max(visibleTop, top);
            visibleBottom = Math.min(visibleBottom, top + ancestor.clientHeight);
          }
          clippedBy.push(ancestor.tagName.toLowerCase() + (ancestor.id ? '#' + ancestor.id : '') +
            (typeof ancestor.className === 'string' && ancestor.className
              ? '.' + ancestor.className.trim().replace(/\s+/g, '.') : ''));
        }
        ancestor = ancestor.parentElement;
      }

      const visibleWidth = Math.max(0, visibleRight - visibleLeft);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const activeGeometryObscured = visibleWidth <= 1 || visibleHeight <= 1;
      const activeOpacityZero = Number(getComputedStyle(active).opacity) === 0;
      let geometryElement = active;
      let geometryLeft = visibleLeft;
      let geometryTop = visibleTop;
      let geometryRight = visibleRight;
      let geometryBottom = visibleBottom;
      let focusProxy = null;

      // A visually hidden native control can validly expose focus on a visible
      // element in its wrapping label. Accept a containing label or immediate
      // label sibling only when that proxy gains a concrete outline/shadow and
      // has usable, unclipped on-screen geometry.
      if ((activeGeometryObscured || activeOpacityZero) &&
          active instanceof HTMLElement && active.labels) {
        const containingLabel = [...active.labels].find((label) => label.contains(active));
        const proxyCandidates = [];
        if (containingLabel) {
          const sibling = active.nextElementSibling;
          if (sibling && containingLabel.contains(sibling)) {
            proxyCandidates.push({ element: sibling, kind: 'adjacent-label-control' });
          }
          proxyCandidates.push({ element: containingLabel, kind: 'containing-label' });
        }
        for (const candidate of proxyCandidates) {
          const proxyElement = candidate.element;
          const proxyPath = elementPath(proxyElement);
          const indicatorProperties = new Set([
            'outlineColor', 'outlineStyle', 'outlineWidth', 'outlineOffset', 'boxShadow',
          ]);
          const indicatorChanges = changes.filter((change) =>
            change.layer === proxyPath && change.part === 'self' &&
            indicatorProperties.has(change.property));
          const proxyStyles = getComputedStyle(proxyElement);
          const outlineColor = proxyStyles.outlineColor;
          const hasVisibleOutline = proxyStyles.outlineStyle !== 'none' &&
            parseFloat(proxyStyles.outlineWidth) > 0 && outlineColor !== 'transparent' &&
            outlineColor !== 'rgba(0, 0, 0, 0)';
          const hasVisibleShadow = proxyStyles.boxShadow && proxyStyles.boxShadow !== 'none';
          if (proxyStyles.display === 'none' || proxyStyles.visibility === 'hidden' ||
              Number(proxyStyles.opacity) === 0 || indicatorChanges.length === 0 ||
              (!hasVisibleOutline && !hasVisibleShadow)) continue;
          const proxyRect = proxyElement.getBoundingClientRect();
          let proxyLeft = Math.max(0, proxyRect.left);
          let proxyTop = Math.max(0, proxyRect.top);
          let proxyRight = Math.min(innerWidth, proxyRect.right);
          let proxyBottom = Math.min(innerHeight, proxyRect.bottom);
          let proxyAncestor = proxyElement.parentElement;
          while (proxyAncestor && proxyAncestor !== document.documentElement) {
            const styles = getComputedStyle(proxyAncestor);
            const clipsX = /^(auto|scroll|hidden|clip)$/.test(styles.overflowX);
            const clipsY = /^(auto|scroll|hidden|clip)$/.test(styles.overflowY);
            const closedSummary = proxyAncestor instanceof HTMLDetailsElement && !proxyAncestor.open
              ? proxyAncestor.querySelector(':scope > summary') : null;
            const isVisibleClosedSummary = !!closedSummary &&
              (proxyElement === closedSummary || closedSummary.contains(proxyElement));
            if ((clipsX || clipsY) && !isVisibleClosedSummary) {
              const box = proxyAncestor.getBoundingClientRect();
              const left = box.left + proxyAncestor.clientLeft;
              const top = box.top + proxyAncestor.clientTop;
              if (clipsX) {
                proxyLeft = Math.max(proxyLeft, left);
                proxyRight = Math.min(proxyRight, left + proxyAncestor.clientWidth);
              }
              if (clipsY) {
                proxyTop = Math.max(proxyTop, top);
                proxyBottom = Math.min(proxyBottom, top + proxyAncestor.clientHeight);
              }
            }
            proxyAncestor = proxyAncestor.parentElement;
          }
          const proxyWidth = Math.max(0, proxyRight - proxyLeft);
          const proxyHeight = Math.max(0, proxyBottom - proxyTop);
          if (proxyWidth <= 1 || proxyHeight <= 1) continue;
          geometryElement = proxyElement;
          geometryLeft = proxyLeft;
          geometryTop = proxyTop;
          geometryRight = proxyRight;
          geometryBottom = proxyBottom;
          focusProxy = {
            kind: candidate.kind,
            path: proxyPath,
            indicatorChanges: indicatorChanges.slice(0, 8),
            rect: {
              left: Math.round(proxyRect.left * 10) / 10,
              top: Math.round(proxyRect.top * 10) / 10,
              right: Math.round(proxyRect.right * 10) / 10,
              bottom: Math.round(proxyRect.bottom * 10) / 10,
              width: Math.round(proxyRect.width * 10) / 10,
              height: Math.round(proxyRect.height * 10) / 10,
            },
            visibleRect: {
              left: Math.round(proxyLeft * 10) / 10,
              top: Math.round(proxyTop * 10) / 10,
              right: Math.round(proxyRight * 10) / 10,
              bottom: Math.round(proxyBottom * 10) / 10,
              width: Math.round(proxyWidth * 10) / 10,
              height: Math.round(proxyHeight * 10) / 10,
            },
          };
          break;
        }
      }
      const geometryWidth = Math.max(0, geometryRight - geometryLeft);
      const geometryHeight = Math.max(0, geometryBottom - geometryTop);
      const points = [];
      if (geometryWidth > 1 && geometryHeight > 1) {
        const insetX = Math.min(2, geometryWidth / 4);
        const insetY = Math.min(2, geometryHeight / 4);
        const xs = [geometryLeft + geometryWidth / 2, geometryLeft + insetX, geometryRight - insetX];
        const ys = [geometryTop + geometryHeight / 2, geometryTop + insetY, geometryBottom - insetY];
        for (const x of xs) for (const y of ys) points.push([x, y]);
      }
      const pointerEvents = getComputedStyle(geometryElement).pointerEvents;
      const hitRecords = points.map(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        const uncovered = !!hit && (hit === geometryElement || geometryElement.contains(hit) ||
          hit.contains(geometryElement));
        return { hit, uncovered };
      });
      const hasUncoveredPoint = pointerEvents === 'none' || hitRecords.some((record) => record.uncovered);
      const geometryObscured = (activeOpacityZero && !focusProxy) ||
        geometryWidth <= 1 || geometryHeight <= 1;
      const possibleAuthorOverlay = !geometryObscured && pointerEvents !== 'none' &&
        points.length > 0 && !hasUncoveredPoint;
      const coverDiagnostics = [];
      const recordedHits = new Set();
      for (const { hit } of hitRecords) {
        if (!hit || recordedHits.has(hit)) continue;
        recordedHits.add(hit);
        const hitStyles = getComputedStyle(hit);
        coverDiagnostics.push({
          selector: hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') +
            (typeof hit.className === 'string' && hit.className
              ? '.' + hit.className.trim().replace(/\s+/g, '.') : ''),
          backgroundColor: hitStyles.backgroundColor,
          opacity: hitStyles.opacity,
          pointerEvents: hitStyles.pointerEvents,
          position: hitStyles.position,
          zIndex: hitStyles.zIndex,
        });
      }

      const focusStyleKeys = [
        'outlineColor', 'outlineStyle', 'outlineWidth', 'outlineOffset', 'boxShadow',
        'backgroundColor', 'color', 'borderTopColor', 'borderTopStyle', 'borderTopWidth',
      ];
      const focusStyle = {};
      const unfocusedStyle = {};
      for (const key of focusStyleKeys) {
        focusStyle[key] = layers[0].styles.self[key];
        if (baseline && baseline[0]) unfocusedStyle[key] = baseline[0].styles.self[key];
      }
      const matchedFocusRules = [];
      if (changes.length === 0) {
        const inspectRules = (rules, sheetIndex) => {
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule && /:focus/.test(rule.selectorText || '')) {
              try {
                if (active.matches(rule.selectorText)) {
                  matchedFocusRules.push({
                    sheetIndex,
                    selector: rule.selectorText.slice(0, 500),
                    declarations: rule.style.cssText.slice(0, 500),
                  });
                }
              } catch (_) {}
            } else if (rule.cssRules) {
              inspectRules(rule.cssRules, sheetIndex);
            }
            if (matchedFocusRules.length >= 12) return;
          }
        };
        [...document.styleSheets].forEach((sheet, sheetIndex) => {
          if (matchedFocusRules.length >= 12) return;
          try { inspectRules(sheet.cssRules, sheetIndex); } catch (_) {}
        });
      }

      const description = window.__alloFocusAudit && window.__alloFocusAudit.descriptions[path];
      return {
        inRoot: true,
        path,
        baselineFound: !!baseline,
        focusVisible: active.matches(':focus-visible'),
        changes: changes.slice(0, 18),
        hasVisibleIndicator: changes.length > 0 && (!activeOpacityZero || !!focusProxy),
        geometryObscured,
        focusProxy,
        possibleAuthorOverlay,
        focusStyle,
        unfocusedStyle,
        matchedFocusRules,
        rect: {
          left: Math.round(rect.left * 10) / 10,
          top: Math.round(rect.top * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          bottom: Math.round(rect.bottom * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        },
        visibleRect: {
          left: Math.round(visibleLeft * 10) / 10,
          top: Math.round(visibleTop * 10) / 10,
          right: Math.round(visibleRight * 10) / 10,
          bottom: Math.round(visibleBottom * 10) / 10,
          width: Math.round(visibleWidth * 10) / 10,
          height: Math.round(visibleHeight * 10) / 10,
        },
        clippedBy,
        coverDiagnostics: coverDiagnostics.slice(0, 6),
        description: description || {
          selector: active.tagName.toLowerCase() + (active.id ? '#' + active.id : ''),
          name: (active.getAttribute('aria-label') || active.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
          html: active.outerHTML.slice(0, 280),
        },
      };
    }, VISUAL_STYLE_KEYS);

    if (!result.inRoot) {
      outsideCount += 1;
      if (seen.size > 0 && outsideCount > 2) break;
      continue;
    }
    outsideCount = 0;
    if (seen.has(result.path)) break;
    seen.add(result.path);
    visits.push(result);
    if (onVisit) await onVisit({ page, result, step });

    if (!result.baselineFound) {
      warnings.push({ reason: 'missing-unfocused-baseline', ...result });
    } else if (!result.hasVisibleIndicator) {
      failures.push({ reason: 'no-visible-focus-indicator', ...result });
    }
    if (result.geometryObscured) {
      failures.push({ reason: 'focused-component-entirely-obscured', ...result });
    }
    if (result.possibleAuthorOverlay) {
      warnings.push({ reason: 'possible-author-overlay', ...result });
    }
  }

  await page.evaluate(() => {
    const state = window.__alloFocusAudit;
    if (state) {
      if (state.bodyTabIndex == null) document.body.removeAttribute('tabindex');
      else document.body.setAttribute('tabindex', state.bodyTabIndex);
      document.documentElement.style.scrollBehavior = state.scrollBehavior;
    }
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    delete window.__alloFocusAudit;
  });

  const unreached = setup.paths.filter((path) => !seen.has(path));
  const unreachedPaths = unreached.slice(0, 20);
  return {
    candidates: setup.candidateCount,
    traversed: seen.size,
    unreached: unreachedPaths,
    unreachedDetails: unreachedPaths.map((path) => ({ path, ...setup.descriptions[path] })),
    warnings: warnings.slice(0, 12),
    failures: failures.slice(0, 16),
    visits,
  };
}
