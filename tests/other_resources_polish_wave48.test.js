import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { React } from './helpers/sel_tool_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no layout, so it ships no scrollIntoView; Peer Support scrolls its chat log.
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {};
}

const roots = [];
// Each test mounts a tool and runs axe-core over several views; that is slower than
// vitest's 5s default on a busy machine.
const TEST_TIMEOUT_MS = 60000;

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

function loadSelTool(relPath, toolId) {
  if (window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]) {
    delete window.SelHub._registry[toolId];
  }
  window.eval(readRepoFile(relPath));
  expect(window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]).toBeTruthy();
}

async function runAxe(container) {
  const result = await axe.run(container, {
    iframes: false,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function mountHost(Component, props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push({ root, host });
  return {
    host,
    async render(nextProps = props) {
      await React.act(async () => {
        root.render(React.createElement(Component, nextProps));
      });
    },
  };
}

function untypedButtons(host) {
  return Array.from(host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button');
}

function buttonByText(host, pattern) {
  return Array.from(host.querySelectorAll('button')).find((b) => pattern.test(b.textContent));
}

function keydown(key, init = {}, composing = false) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  if (composing) Object.defineProperty(ev, 'isComposing', { value: true });
  return ev;
}

afterEach(async () => {
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => { root.unmount(); });
    host.remove();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 48 (SEL Hub Quartet: Voice Detective, Healthy Relationships, Stress Bucket, Peer Support Coach)', () => {
  it('polishes sel_hub/sel_tool_voicedetective.js across mirrors (scoped a11y CSS, AA ink maps, typed 44px controls, high-contrast checked difficulty, host-first SR announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_voicedetective.js');
    expect(src).toContain('allo-voicedet-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain("'#16a34a':'#166534'");
    expect(src).toContain("'#dc2626':'#fca5a5'");

    loadSelTool('sel_hub/sel_tool_voicedetective.js', 'voicedetective');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function VoiceHost(props) {
      const [toolData, setToolData] = React.useState({
        voicedetective: { _totalTrials: 4, _totalCorrect: 3 },
      });
      return window.SelHub.renderTool('voicedetective', {
        React,
        toolData,
        setToolData,
        addToast: () => {},
        awardXP: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'elementary',
        theme: { isDark: false, isContrast: !!props.contrast },
      });
    }

    const { host, render } = mountHost(VoiceHost, { contrast: false });
    await render();

    expect(document.getElementById('allo-voicedet-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-voicedet')).toBeTruthy();
    expect(untypedButtons(host)).toEqual([]);

    // Difficulty radios: 44px targets; choosing one moves aria-checked
    const radios = Array.from(host.querySelectorAll('[role="radio"]'));
    expect(radios).toHaveLength(3);
    for (const r of radios) expect(r.style.minHeight).toBe('44px');
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    await React.act(async () => { radios[1].click(); });
    expect(host.querySelectorAll('[role="radio"]')[1].getAttribute('aria-checked')).toBe('true');
    await runAxe(host);

    // High contrast: every border and label is yellow, so the checked option must still look different
    await render({ contrast: true });
    const hcRadios = Array.from(host.querySelectorAll('[role="radio"]'));
    const hcChecked = hcRadios.find((r) => r.getAttribute('aria-checked') === 'true');
    const hcUnchecked = hcRadios.find((r) => r.getAttribute('aria-checked') === 'false');
    expect(hcChecked.style.background).not.toBe(hcUnchecked.style.background);
    expect(hcChecked.style.color).not.toBe(hcUnchecked.style.color);
    await render({ contrast: false });

    // Mode 1: the round auto-plays 300ms after it starts, so wait for that inside act
    await React.act(async () => {
      buttonByText(host, /What Am I Feeling\?/).click();
      await new Promise((r) => setTimeout(r, 340));
    });
    expect(host.querySelector('.selh-voicedet')).toBeTruthy();
    expect(untypedButtons(host)).toEqual([]);
    expect(buttonByText(host, /← Back/).style.minHeight).toBe('44px');
    await runAxe(host);

    // Answering announces through the host announcer only (no second copy in the tool's own region)
    await React.act(async () => { host.querySelector('[role="group"] button').click(); });
    expect(announcements.some((m) => /^(Correct!|Incorrect\.)/.test(m))).toBe(true);
    expect(document.getElementById('allo-live-voicedet').textContent).toBe('');
    // Back cancels the pending next-round timer
    await React.act(async () => { buttonByText(host, /← Back/).click(); });

    // Mode 2: 44px selects and a typed 44px Check button
    await React.act(async () => { buttonByText(host, /Same Words, Different Feelings/).click(); });
    const selects = Array.from(host.querySelectorAll('select'));
    expect(selects.length).toBeGreaterThanOrEqual(2);
    for (const s of selects) expect(s.style.minHeight).toBe('44px');
    const checkBtn = buttonByText(host, /Check My Answers/);
    expect(checkBtn.getAttribute('type')).toBe('button');
    expect(checkBtn.style.minHeight).toBe('44px');
    expect(untypedButtons(host)).toEqual([]);
    await runAxe(host);
    await React.act(async () => { buttonByText(host, /← Back/).click(); });

    expect(errSpy).not.toHaveBeenCalled();
  }, TEST_TIMEOUT_MS);

  it('polishes sel_hub/sel_tool_healthyrelationships.js across mirrors (scoped a11y CSS, AA light ink map, typed 44px controls & helpline links, IME/modifier-safe tablist, border-box fields, section announcements with region fallback, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_healthyrelationships.js');
    expect(src).toContain('allo-relationships-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain("'#94a3b8':'#475569'");
    expect(src).toContain("'#bbf7d0':'#166534'");
    expect(src).toContain("'#dcfce7':'#14532d'");
    expect(src).toContain("'#cffafe':'#155e75'");

    loadSelTool('sel_hub/sel_tool_healthyrelationships.js', 'healthyRelationships');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function RelationshipsHost(props) {
      const [toolData, setToolData] = React.useState({
        healthyRelationships: { view: 'home', check: {}, checkContext: '', notes: '' },
      });
      const ctx = {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        onSafetyFlag: () => {},
        gradeBand: 'high',
        theme: { isDark: false, isContrast: false },
      };
      if (!props.noHostAnnouncer) ctx.announceToSR = (msg) => announcements.push(msg);
      return window.SelHub.renderTool('healthyRelationships', ctx);
    }

    const { host, render } = mountHost(RelationshipsHost, { noHostAnnouncer: false });
    await render();

    expect(document.getElementById('allo-relationships-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-relationships')).toBeTruthy();
    expect(untypedButtons(host)).toEqual([]);
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    await runAxe(host);

    // IME-composing and modifier-held arrows must NOT switch tabs
    const homeTab = host.querySelector('#hr-tab-home');
    expect(homeTab.style.minHeight).toBe('44px');
    await React.act(async () => { homeTab.dispatchEvent(keydown('ArrowRight', {}, true)); });
    expect(host.querySelector('#hr-tab-home').getAttribute('aria-selected')).toBe('true');
    await React.act(async () => { homeTab.dispatchEvent(keydown('ArrowRight', { altKey: true })); });
    expect(host.querySelector('#hr-tab-home').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves The spectrum -> Check a relationship with focus transfer & SR announcement
    await React.act(async () => {
      homeTab.dispatchEvent(keydown('ArrowRight'));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#hr-tab-check').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#hr-tab-check'));
    expect(announcements.some((m) => /Check a relationship section shown/i.test(m))).toBe(true);
    expect(document.getElementById('allo-live-relationships').textContent).toBe('');

    // Check view: border-box fields, 44px context input, typed rating buttons that still toggle
    expect(host.querySelector('#hr-context').style.minHeight).toBe('44px');
    expect(host.querySelector('#hr-context').style.boxSizing).toBe('border-box');
    expect(host.querySelector('#hr-notes').style.boxSizing).toBe('border-box');
    const abusiveBtn = buttonByText(host, /^✕ ABUSIVE/);
    expect(abusiveBtn.getAttribute('type')).toBe('button');
    await React.act(async () => { abusiveBtn.click(); });
    expect(buttonByText(host, /^✕ ABUSIVE/).getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[role="alert"]').textContent).toMatch(/marked abusive/);
    expect(untypedButtons(host)).toEqual([]);
    await runAxe(host);

    // A step card on Home changes section without moving focus to a tab, so it must announce
    await React.act(async () => { host.querySelector('#hr-tab-home').click(); });
    const safetyCard = Array.from(host.querySelectorAll('button')).find((b) => /Safety \+ help$/.test(b.getAttribute('aria-label') || ''));
    expect(safetyCard).toBeTruthy();
    await React.act(async () => { safetyCard.click(); });
    expect(host.querySelector('#hr-tab-safety').getAttribute('aria-selected')).toBe('true');
    expect(announcements.some((m) => /Safety \+ help section shown/i.test(m))).toBe(true);

    // Safety view: helpline links are 44px targets
    const helpline = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /Loveisrespect \(teens/.test(a.textContent));
    expect(helpline).toBeTruthy();
    expect(helpline.style.minHeight).toBe('44px');
    await runAxe(host);

    // Consent, Print, About: typed 44px Print button, 44px source links, 0 axe violations
    await React.act(async () => { host.querySelector('#hr-tab-consent').click(); });
    await runAxe(host);
    await React.act(async () => { host.querySelector('#hr-tab-print').click(); });
    const printBtn = buttonByText(host, /Print \/ Save as PDF/);
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);
    await React.act(async () => { host.querySelector('#hr-tab-about').click(); });
    const sourceLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /futureswithoutviolence\.org/.test(a.textContent));
    expect(sourceLink).toBeTruthy();
    expect(sourceLink.style.minHeight).toBe('44px');
    await runAxe(host);

    // Without a host announcer the tool falls back to its own polite live region
    await render({ noHostAnnouncer: true });
    await React.act(async () => {
      host.querySelector('#hr-tab-consent').click();
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(document.getElementById('allo-live-relationships').textContent).toMatch(/Consent section shown/i);

    expect(errSpy).not.toHaveBeenCalled();
  }, TEST_TIMEOUT_MS);

  it('polishes sel_hub/sel_tool_stressbucket.js across mirrors (scoped a11y CSS, AA dark/light ink, non-conflicting stat borders, typed 44px controls/inputs/starters/summaries, IME-safe tablist & Enter-to-add, polite list announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_stressbucket.js');
    expect(src).toContain('allo-stressbucket-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    expect(src).toContain("_sbk_FGD = {'#ef4444':'#f87171'}");
    expect(src).toContain("'#99f6e4':'#115e59'");

    loadSelTool('sel_hub/sel_tool_stressbucket.js', 'stressBucket');

    const announcements = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BucketHost(props) {
      const [toolData, setToolData] = React.useState({
        stressBucket: {
          view: 'bucket',
          stressors: [{ label: 'Tests', weight: 4 }, { label: 'Home', weight: 2 }],
          taps: [{ label: 'Walk', capacity: 3 }],
          overflowSigns: [],
          lastUpdated: '2026-11-22',
        },
      });
      return window.SelHub.renderTool('stressBucket', {
        React,
        toolData,
        setToolData,
        setSelHubTool: () => {},
        addToast: () => {},
        onSafetyFlag: () => {},
        announceToSR: (msg) => announcements.push(msg),
        gradeBand: 'middle',
        theme: { isDark: false, isContrast: !!props.contrast },
      });
    }

    const { host, render } = mountHost(BucketHost, { contrast: false });
    await render();

    expect(document.getElementById('allo-stressbucket-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-stressbucket')).toBeTruthy();
    expect(untypedButtons(host)).toEqual([]);
    expect(host.querySelector('button[aria-label="Back to SEL Hub"]').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Edit bucket"]').style.minHeight).toBe('44px');
    expect(host.querySelector('summary').style.minHeight).toBe('44px');
    await runAxe(host);

    // A live theme switch changes the stat cards' 1px edge but not the Net balance accent.
    // With `border` + `borderTop` on one element that wiped the 3px accent and made React
    // warn (caught by errSpy below); four longhands keep it.
    await render({ contrast: true });
    const netStat = host.querySelector('[role="group"][aria-label="Stress bucket totals"]').lastElementChild;
    expect(netStat.textContent).toMatch(/Net balance/);
    expect(netStat.style.borderTopWidth).toBe('3px');
    await render({ contrast: false });

    // IME-composing ArrowRight must NOT switch tabs
    const bucketTab = host.querySelector('#sb-tab-bucket');
    expect(bucketTab.style.minHeight).toBe('44px');
    await React.act(async () => { bucketTab.dispatchEvent(keydown('ArrowRight', {}, true)); });
    expect(host.querySelector('#sb-tab-bucket').getAttribute('aria-selected')).toBe('true');
    await React.act(async () => { bucketTab.dispatchEvent(keydown('ArrowRight', { ctrlKey: true })); });
    expect(host.querySelector('#sb-tab-bucket').getAttribute('aria-selected')).toBe('true');

    // ArrowRight moves My Bucket -> Edit with focus transfer & SR announcement
    await React.act(async () => {
      bucketTab.dispatchEvent(keydown('ArrowRight'));
      await new Promise((r) => setTimeout(r, 15));
    });
    expect(host.querySelector('#sb-tab-edit').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('#sb-tab-edit'));
    expect(announcements.some((m) => /Edit section shown/i.test(m))).toBe(true);

    // Edit view: 44px border-box inputs, 44px selects, typed 44px Add buttons & starters
    for (const id of ['sb-stressor-input', 'sb-tap-input', 'sb-overflow-input']) {
      const inp = host.querySelector('#' + id);
      expect(inp, id).toBeTruthy();
      expect(inp.style.minHeight).toBe('44px');
      expect(inp.style.boxSizing).toBe('border-box');
    }
    expect(host.querySelector('#sb-stressor-weight').style.minHeight).toBe('44px');
    expect(host.querySelector('#sb-tap-capacity').style.minHeight).toBe('44px');
    expect(host.querySelector('button[aria-label="Add stressor"]').style.minHeight).toBe('44px');
    expect(untypedButtons(host)).toEqual([]);
    await runAxe(host);

    // Enter while an IME is composing must NOT add; a plain Enter adds and announces
    const stressorInput = host.querySelector('#sb-stressor-input');
    stressorInput.value = 'Homework';
    await React.act(async () => { stressorInput.dispatchEvent(keydown('Enter', {}, true)); });
    expect(host.querySelectorAll('button[aria-label^="Remove stressor: "]')).toHaveLength(2);
    expect(announcements.some((m) => /Added stressor/i.test(m))).toBe(false);
    await React.act(async () => { stressorInput.dispatchEvent(keydown('Enter')); });
    expect(host.querySelectorAll('button[aria-label^="Remove stressor: "]')).toHaveLength(3);
    expect(announcements).toContain('Added stressor: Homework');

    // Removing announces which item went
    const removeBtn = host.querySelector('button[aria-label="Remove stressor: Homework"]');
    expect(removeBtn.getAttribute('type')).toBe('button');
    await React.act(async () => { removeBtn.click(); });
    expect(announcements).toContain('Removed stressor: Homework');

    // Starter chips are typed 44px targets and announce what they add
    const starter = host.querySelector('button[aria-label="Add starter: Not enough sleep"]');
    expect(starter.getAttribute('type')).toBe('button');
    expect(starter.style.minHeight).toBe('44px');
    await React.act(async () => { starter.click(); });
    expect(announcements).toContain('Added stressor: Not enough sleep');
    await runAxe(host);

    // Reflect, Print and About: typed 44px Print button, 44px source link, 0 axe violations
    await React.act(async () => { host.querySelector('#sb-tab-reflect').click(); });
    await runAxe(host);
    await React.act(async () => { host.querySelector('#sb-tab-print').click(); });
    const printBtn = buttonByText(host, /Print \/ Save as PDF/);
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    await runAxe(host);
    await React.act(async () => { host.querySelector('#sb-tab-about').click(); });
    const sourceLink = Array.from(host.querySelectorAll('a[href^="https://"]')).find((a) => /mind\.org\.uk/.test(a.textContent));
    expect(sourceLink).toBeTruthy();
    expect(sourceLink.style.minHeight).toBe('44px');
    await runAxe(host);

    expect(errSpy).not.toHaveBeenCalled();
  }, TEST_TIMEOUT_MS);

  it('polishes sel_hub/sel_tool_peersupport.js across mirrors (scoped a11y CSS, typed 44px controls, IME-safe chat Enter, host-first SR announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('sel_hub/sel_tool_peersupport.js');
    expect(src).toContain('allo-peersupport-a11y-css');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');

    loadSelTool('sel_hub/sel_tool_peersupport.js', 'peersupport');

    const announcements = [];
    const callGemini = vi.fn(async () => 'I have been feeling kind of down lately.');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function PeerHost(props) {
      const [toolData, setToolData] = React.useState({ peersupport: {} });
      const merge = (id, obj) => setToolData((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...obj } }));
      return window.SelHub.renderTool('peersupport', {
        React,
        toolData,
        setToolData,
        update: (id, key, value) => merge(id, { [key]: value }),
        updateMulti: merge,
        addToast: () => {},
        awardXP: () => {},
        onSafetyFlag: () => {},
        announceToSR: (msg) => announcements.push(msg),
        callGemini: props.ai ? callGemini : null,
        gradeBand: 'middle',
        theme: { isDark: false, isContrast: false },
      });
    }

    const { host, render } = mountHost(PeerHost, { ai: false });
    await render();

    expect(document.getElementById('allo-peersupport-a11y-css')).toBeTruthy();
    expect(host.querySelector('.selh-peersupport')).toBeTruthy();
    expect(untypedButtons(host)).toEqual([]);
    const openPractice = buttonByText(host, /Open vs\. Closed Questions/);
    expect(openPractice.style.minHeight).toBe('44px');
    expect(buttonByText(host, /Print OARS pocket card/).style.minHeight).toBe('44px');
    await runAxe(host);

    // Skill practice: typed 44px Back/Next, answers and progress announced through the host only
    await React.act(async () => { openPractice.click(); });
    expect(host.querySelector('.selh-peersupport')).toBeTruthy();
    expect(untypedButtons(host)).toEqual([]);
    expect(buttonByText(host, /← Back/).style.minHeight).toBe('44px');
    await runAxe(host);
    await React.act(async () => { host.querySelector('button[aria-label^="Response A: "]').click(); });
    expect(announcements.some((m) => /^(Correct!|That was the closed question\.)$/.test(m))).toBe(true);
    expect(document.getElementById('allo-live-peersupport').textContent).toBe('');
    const nextBtn = buttonByText(host, /Next →/);
    expect(nextBtn.getAttribute('type')).toBe('button');
    expect(nextBtn.style.minHeight).toBe('44px');
    await React.act(async () => { nextBtn.click(); });
    expect(announcements.some((m) => /^Exercise 2 of \d+\. Choose your response\.$/.test(m))).toBe(true);
    await React.act(async () => { buttonByText(host, /← Back/).click(); });

    // Scripted conversation (no AI): 44px back control, typed choices, start announced
    await React.act(async () => { host.querySelector('[data-ps-script-card="lonely"]').click(); });
    expect(announcements.some((m) => /^Scripted practice conversation started: /.test(m))).toBe(true);
    expect(host.querySelector('.selh-peersupport')).toBeTruthy();
    expect(buttonByText(host, /← All conversations/).style.minHeight).toBe('44px');
    expect(host.querySelectorAll('[data-ps-choice]').length).toBeGreaterThan(0);
    expect(untypedButtons(host)).toEqual([]);
    await runAxe(host);
    await React.act(async () => { buttonByText(host, /← All conversations/).click(); });
    expect(buttonByText(host, /← Back/).style.minHeight).toBe('44px');
    await React.act(async () => { buttonByText(host, /← Back/).click(); });

    // Print pocket card: typed 44px Print button
    await React.act(async () => { buttonByText(host, /Print OARS pocket card/).click(); });
    const printBtn = buttonByText(host, /Print \/ Save as PDF/);
    expect(printBtn.getAttribute('type')).toBe('button');
    expect(printBtn.style.minHeight).toBe('44px');
    expect(untypedButtons(host)).toEqual([]);
    await runAxe(host);
    await React.act(async () => { buttonByText(host, /← Back/).click(); });

    // AI role-play: 44px border-box chat input; Enter while an IME is composing must NOT send
    await render({ ai: true });
    await React.act(async () => {
      host.querySelector('[data-ps-scripted-mode]').parentElement.previousElementSibling.querySelector('button').click();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(callGemini).toHaveBeenCalledTimes(1);
    const chatInput = host.querySelector('input[aria-label="Your response using OARS skills"]');
    expect(chatInput).toBeTruthy();
    expect(chatInput.style.minHeight).toBe('44px');
    expect(chatInput.style.boxSizing).toBe('border-box');
    expect(host.querySelector('button[aria-label="Send OARS response"]').style.minHeight).toBe('44px');
    expect(untypedButtons(host)).toEqual([]);
    await runAxe(host);

    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      setValue.call(chatInput, 'Tell me more about that.');
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => { chatInput.dispatchEvent(keydown('Enter', {}, true)); });
    expect(callGemini).toHaveBeenCalledTimes(1);
    await React.act(async () => {
      chatInput.dispatchEvent(keydown('Enter'));
      await new Promise((r) => setTimeout(r, 140));
    });
    expect(callGemini).toHaveBeenCalledTimes(2);

    expect(errSpy).not.toHaveBeenCalled();
  }, TEST_TIMEOUT_MS);
});
