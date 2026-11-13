'use strict';
// Shared per-page accessibility audit (2026-11-12), lifted from dev-tools/check_packets_a11y.cjs so other gates
// (the resource-pack export: check_pack_export_a11y.cjs) run the same checks. One Playwright page at a time:
//   axe        axe-core WCAG 2.0/2.1/2.2 A + AA at 1280 and 375 px, landmark/heading structure at 1280, and dark
//              mode when asked
//   reflow     no sideways scroll at 640 and 320 CSS px (1280 px at 200% and 400% zoom)
//   motion     with prefers-reduced-motion: reduce, nothing animates or transitions longer than 0.01 s
//   names      every button and link has a name with a letter or digit in it
//   keyboard   every visible control is reached by Tab from the top; each looks different when focused
//   live       (liveStart/liveCheck) feedback after an action reaches a live region
// "Skipped is not passed": a check that cannot run is recorded in `skipped`, and a gate should fail on it.
//
//   const A = require('./a11y_page_audit.cjs').createAudit();
//   await A.selfTest(browser);                    // throws unless axe finds three planted faults
//   await A.audit(page, 'state name', { dark: true });
//   A.findings, A.skipped, A.passes, A.report(stateNames)
const fs = require('node:fs');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
// Landmarks and headings: axe files these under best practice, not under a WCAG number. Run them too (1280 px).
const STRUCTURE = { type: 'rule', values: ['landmark-one-main', 'region', 'page-has-heading-one', 'heading-order', 'landmark-unique', 'landmark-no-duplicate-main',
  'landmark-banner-is-top-level', 'landmark-contentinfo-is-top-level', 'landmark-main-is-top-level', 'landmark-complementary-is-top-level', 'empty-heading', 'empty-table-header'] };
const FOCUSABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable=true]';
let AXE = null;
const axeSource = () => AXE || (AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));

// ---------------------------------------------------------------------------
// In-page probes (run with page.evaluate; they use only their arguments)
// ---------------------------------------------------------------------------
function probeControls(selector) {
  // Visible, enabled controls a keyboard user should be able to Tab to. Each gets a data-a11y-n.
  const visible = (el) => {
    if (el.closest('[inert],[aria-hidden=true]')) return false;
    if (el.disabled) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') return false; if (n.tagName === 'DETAILS' && !n.open && n !== el && !(el.closest('summary') && el.closest('summary').parentElement === n)) return false; }
    return true;
  };
  let n = 0;
  const list = [];
  document.querySelectorAll(selector).forEach((el) => {
    if (el.tagName === 'INPUT' && el.type === 'radio' && !el.checked && document.querySelector('input[type=radio][name="' + el.name + '"]:checked')) return; // a radio group is one tab stop
    if (el.tagName === 'INPUT' && el.type === 'radio' && !el.checked && [...document.querySelectorAll('input[type=radio][name="' + el.name + '"]')][0] !== el) return;
    if (!visible(el) && !(el.tagName === 'INPUT' && !el.disabled && /^(radio|checkbox)$/.test(el.type) && el.closest('label') && visible(el.closest('label')))) return;
    el.setAttribute('data-a11y-n', String(++n));
    const name = (el.getAttribute('aria-label') || el.textContent || el.value || el.getAttribute('title') || el.id || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 50);
    list.push({ n, tag: el.tagName.toLowerCase(), name, id: el.id || '' });
  });
  return list;
}
function probeStyleOf(n) {
  const el = n > 0 ? document.querySelector('[data-a11y-n="' + n + '"]') : null;
  if (!el) return null;
  const pick = (node) => { const s = getComputedStyle(node); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.borderTopWidth, s.backgroundColor, s.color, s.textDecorationLine].join('|'); };
  // The ring may be on the control or on a box around it (:focus-within on a label or a card): 4 levels up.
  const out = [pick(el)];
  for (let p = el.parentElement, i = 0; p && i < 4; p = p.parentElement, i++) out.push(pick(p));
  return out.join('#');
}
function probeActive() {
  const a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return { n: 0, tag: a ? a.tagName.toLowerCase() : '' };
  if (a.tagName === 'IFRAME') return { n: -1, tag: 'iframe' };
  // -2: a stop this probe did not list (the walk goes on past it).
  return { n: Number(a.getAttribute('data-a11y-n')) || -2, id: a.id || '', tag: a.tagName.toLowerCase(), name: (a.getAttribute('aria-label') || a.textContent || a.id || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
}
function probeReflow() {
  const width = document.documentElement.clientWidth;
  const scroll = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const wide = [];
  if (scroll > width + 1) {
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > width + 1 && r.width > 0 && wide.length < 400) {
        for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return; }
        wide.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')).slice(0, 80) + ' (' + Math.round(r.right) + 'px)');
      }
    });
  }
  return { width, scroll, wide: wide.slice(-4) };
}
function probeMotion() {
  const secs = (v) => String(v).split(',').map((x) => parseFloat(x) * (/ms/.test(x) ? 0.001 : 1) || 0);
  const found = [];
  document.querySelectorAll('*').forEach((el) => {
    const s = getComputedStyle(el);
    const moving = (s.animationName !== 'none' && Math.max(...secs(s.animationDuration)) > 0.01 && s.animationPlayState !== 'paused')
      || (s.transitionProperty !== 'none' && Math.max(...secs(s.transitionDuration)) > 0.01);
    if (moving && found.length < 6) found.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')) + ' ' + (s.animationName !== 'none' ? 'animation ' + s.animationName : 'transition ' + s.transitionProperty + ' ' + s.transitionDuration));
  });
  if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') found.push('html scroll-behavior: smooth');
  return found;
}
function probeNames() {
  // Buttons whose name has no letter or digit in it (an icon alone). A name from aria-labelledby is read too.
  const bad = [];
  document.querySelectorAll('button, [role=button], a[href]').forEach((el) => {
    if (el.closest('[inert],[aria-hidden=true]')) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const by = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map((id) => { const t = document.getElementById(id); return t ? t.textContent : ''; }).join(' ');
    const name = (by || el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    if (!/[\p{L}\p{N}]/u.test(name)) bad.push((el.outerHTML || '').slice(0, 100));
  });
  return bad;
}
function probeLiveStart() {
  window.__a11yLive = [];
  const isLive = (n) => n && n.nodeType === 1 && n.closest('[aria-live]:not([aria-live=off]),[role=status],[role=alert],[role=log]');
  const ob = new MutationObserver((list) => {
    list.forEach((m) => {
      const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const live = isLive(target);
      if (!live) {
        // A live region ADDED with its text already in it is often not read: recorded apart.
        m.addedNodes && m.addedNodes.forEach((a) => { if (a.nodeType === 1 && a.matches('[aria-live],[role=status],[role=alert]') && a.textContent.trim()) window.__a11yLive.push({ text: a.textContent.trim().slice(0, 80), inserted: true }); });
        return;
      }
      const text = live.textContent.trim();
      if (text) window.__a11yLive.push({ text: text.slice(0, 80), inserted: false });
    });
  });
  ob.observe(document.body, { subtree: true, childList: true, characterData: true });
  window.__a11yLiveStop = () => ob.disconnect();
}

// ---------------------------------------------------------------------------
// One audit run: its own findings, skipped list and passes
// ---------------------------------------------------------------------------
function createAudit(options) {
  const opts = Object.assign({ tags: TAGS, structure: STRUCTURE, startSelector: null }, options || {});
  const findings = [];   // { state, check, rule, impact, count, detail }
  const skipped = [];    // { state, what, why }
  const passes = {};     // state -> list of checks run
  const add = (state, check, rule, count, detail, impact) => { findings.push({ state, check, rule, impact: impact || '', count, detail: detail || '' }); };
  const passed = (state, ...checks) => { (passes[state] = passes[state] || []).push(...checks); };

  async function axeRun(page, state, label, only) {
    let total = 0;
    for (const frame of page.frames()) {
      let result;
      try {
        const has = await frame.evaluate(() => typeof window.axe === 'object').catch(() => false);
        if (!has) await frame.evaluate(axeSource());
        result = await frame.evaluate((runOnly) => window.axe.run(document, { runOnly, iframes: false, resultTypes: ['violations'] })
          .then((r) => ({ violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join(' ').trim()) })) })), only || { type: 'tag', values: opts.tags });
      } catch (error) {
        const why = String(error.message || error).split('\n')[0];
        if (frame === page.mainFrame()) { skipped.push({ state, what: 'axe ' + label, why }); return total; }
        skipped.push({ state, what: 'axe ' + label + ' in a frame (' + frame.url().slice(0, 60) + ')', why });
        continue;
      }
      const where = frame === page.mainFrame() ? '' : ' [frame]';
      result.violations.forEach((v) => { total += v.nodes.length; add(state, 'axe ' + label + where, v.id, v.nodes.length, v.nodes.slice(0, 3).join(' || '), v.impact); });
    }
    passed(state, 'axe ' + label);
    return total;
  }

  async function keyboard(page, state, { startSelector } = {}) {
    const controls = await page.evaluate(probeControls, FOCUSABLE);
    if (!controls.length) { skipped.push({ state, what: 'keyboard', why: 'no visible controls' }); return; }
    // The look of each control without the focus: take the focus away first.
    await page.evaluate(() => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); });
    const styles = await page.evaluate(([fn, list]) => { const style = new Function('return (' + fn + ')')(); const o = {}; list.forEach((n) => { o[n] = style(n); }); return o; }, [probeStyleOf.toString(), controls.map((c) => c.n)]);
    // From the top: focus a stand-in at the start of <body> and take it away; Tab then starts there.
    await page.evaluate(() => { const m = document.createElement('div'); m.tabIndex = -1; document.body.insertBefore(m, document.body.firstChild); m.focus(); m.remove(); });
    const seen = [], order = [];
    for (let i = 0; i < controls.length * 2 + 12; i++) {
      await page.keyboard.press('Tab');
      const a = await page.evaluate(([fa, fs]) => { const a = new Function('return (' + fa + ')')()(); a.style = new Function('return (' + fs + ')')()(a.n); return a; }, [probeActive.toString(), probeStyleOf.toString()]);
      if (a.n === -1 || a.n === -2) { order.push(a.tag); if (order.length > controls.length * 2 + 8) break; continue; }
      if (a.n === 0) { if (order.length) break; else continue; }
      if (seen.includes(a.n)) break;
      seen.push(a.n); order.push(a.n);
      if (a.style === styles[a.n]) { const c = controls.find((x) => x.n === a.n); add(state, 'focus', 'no-visible-focus', 1, c.tag + ' "' + c.name + '"'); }
    }
    const missed = controls.filter((c) => !seen.includes(c.n));
    if (missed.length) add(state, 'keyboard', 'not-reached-by-tab', missed.length, missed.slice(0, 6).map((c) => c.tag + (c.id ? '#' + c.id : '') + ' "' + c.name + '"').join(', '));
    const start = startSelector || opts.startSelector;
    if (start) {
      // Forward only from where the page puts the focus (a screen heading): every control must come after it.
      const at = await page.evaluate((sel) => { const h = document.querySelector(sel); if (h) h.focus(); return !!h && document.activeElement === h; }, start);
      if (!at) skipped.push({ state, what: 'keyboard from ' + start, why: 'nothing to start from' });
      else {
        const fwd = [];
        for (let i = 0; i < controls.length + 6; i++) {
          await page.keyboard.press('Tab');
          const a = await page.evaluate(probeActive);
          if (a.n === -1 || a.n === -2) continue;
          if (a.n <= 0 || fwd.includes(a.n)) break;
          fwd.push(a.n);
        }
        const back = controls.filter((c) => !fwd.includes(c.n));
        if (back.length) add(state, 'keyboard', 'needs-shift-tab', back.length, 'From ' + start + ', Tab forward never reaches: ' + back.slice(0, 6).map((c) => c.tag + (c.id ? '#' + c.id : '') + ' "' + c.name + '"').join(', '));
      }
    }
    passed(state, 'keyboard', 'focus');
  }

  async function audit(page, state, { dark, startSelector, keyboard: doKeyboard = true } = {}) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(80);
    await axeRun(page, state, '1280');
    await axeRun(page, state, 'structure', opts.structure);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(80);
    await axeRun(page, state, '375');
    for (const width of [640, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(80);
      const r = await page.evaluate(probeReflow);
      if (r.scroll > r.width + 1) add(state, 'reflow', 'horizontal-scroll-' + width, 1, 'content ' + r.scroll + ' px wide in ' + r.width + ' px: ' + r.wide.join(', '));
    }
    passed(state, 'reflow 640', 'reflow 320');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(60);
    const motion = await page.evaluate(probeMotion);
    if (motion.length) add(state, 'motion', 'moves-with-reduced-motion', motion.length, motion.join('; '));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const names = await page.evaluate(probeNames);
    if (names.length) add(state, 'names', 'button-name-without-a-word', names.length, names.slice(0, 3).join(' || '));
    passed(state, 'motion', 'names');
    if (dark) {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(80);
      await axeRun(page, state, 'dark');
      await page.emulateMedia({ colorScheme: 'light' });
    }
    if (doKeyboard) await keyboard(page, state, { startSelector });
  }

  // Call before the action, then liveCheck after it: fails unless a live region's text changed.
  const liveStart = (page) => page.evaluate(probeLiveStart);
  async function liveCheck(page, state) {
    const live = await page.evaluate(() => { const l = window.__a11yLive || []; if (window.__a11yLiveStop) window.__a11yLiveStop(); return l; });
    const said = live.filter((x) => !x.inserted);
    if (!said.length) add(state, 'live', 'feedback-not-announced', 1, live.length ? 'only inserted with its text already in it: ' + live.map((x) => x.text).join(' / ') : 'no live region changed after the action');
    passed(state, 'live');
  }

  // axe must find three planted faults, or every "0 findings" below means nothing.
  async function selfTest(browser) {
    const context = await browser.newContext({ bypassCSP: true });
    const page = await context.newPage();
    await page.setContent('<!doctype html><html><head><title>t</title></head><body><main><img src="x.png"><button></button><p style="color:#bbb;background:#fff">low contrast</p></main></body></html>');
    const before = findings.length;
    await axeRun(page, '(self-test)', 'self-test');
    const rules = findings.slice(before).map((x) => x.rule).sort();
    findings.length = before;
    delete passes['(self-test)'];
    await context.close();
    if (!['button-name', 'color-contrast', 'image-alt'].every((r) => rules.includes(r))) throw new Error('axe self-test failed: found ' + (rules.join(', ') || 'nothing') + ' on a page with three known faults');
  }

  function report(stateNames) {
    const byState = {};
    findings.forEach((x) => { (byState[x.state] = byState[x.state] || []).push(x); });
    const lines = [];
    for (const name of stateNames) {
      const list = byState[name] || [];
      const skip = skipped.filter((x) => x.state === name);
      lines.push((list.length || skip.length ? 'FAIL ' : 'ok   ') + name + (list.length ? '  (' + list.length + ' finding' + (list.length > 1 ? 's' : '') + ')' : ''));
      list.forEach((x) => lines.push('       ' + x.check + '  ' + x.rule + (x.impact ? ' [' + x.impact + ']' : '') + ' x' + x.count + '  ' + x.detail.slice(0, 300)));
      skip.forEach((x) => lines.push('       SKIPPED ' + x.what + ': ' + x.why));
    }
    const byRule = {};
    findings.forEach((x) => { const k = x.check.replace(/ \[frame\]$/, '').replace(/^axe .*/, 'axe') + ' ' + x.rule; byRule[k] = byRule[k] || { states: 0, nodes: 0 }; byRule[k].states++; byRule[k].nodes += x.count; });
    lines.push('', 'By rule (states, elements):');
    Object.keys(byRule).sort().forEach((k) => lines.push('  ' + k + ': ' + byRule[k].states + ' states, ' + byRule[k].nodes));
    lines.push('', 'Findings: ' + findings.length + ' (' + findings.reduce((a, x) => a + x.count, 0) + ' elements). Skipped: ' + skipped.length + '.');
    if (skipped.length) lines.push('Skipped is not passed: ' + skipped.map((x) => x.state + ' (' + x.what + ')').join('; '));
    return { text: lines.join('\n'), byRule };
  }

  return { audit, axeRun, keyboard, liveStart, liveCheck, selfTest, report, add, findings, skipped, passes };
}

module.exports = { createAudit, TAGS, STRUCTURE, FOCUSABLE, probeControls, probeStyleOf, probeActive, probeReflow, probeMotion, probeNames, probeLiveStart };
