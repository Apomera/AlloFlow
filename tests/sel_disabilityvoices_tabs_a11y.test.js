// Disability Voices — tab pattern, live-region announcement, type scale, and
// the accuracy of the one statistic the tool quotes from a contested study.
//
// The tab assertions MOUNT the real plugin and dispatch real key events rather
// than grepping the source. A source pin would pass just as happily against
// role="tab" markup that no screen reader can actually use, which is the exact
// defect this file exists to keep from coming back: the tool shipped a
// tablist with no panel, no aria-controls, and no arrow-key handling.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_disabilityvoices.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_disabilityvoices.js');

const TAB_IDS = ['home', 'reading', 'orgs', 'about'];
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };
const noop = () => {};

let React;
let ReactDOMClient;
let act;
let axe;
let toolConfig;
let root;
let host;

function makeBaseCtx() {
  const palProxy = new Proxy({}, { get: () => '#888888' });
  const iconsProxy = new Proxy({}, { get: () => () => null });
  const themeBase = { isDark: false, isContrast: false, reduceMotion: false, palette: palProxy };
  const theme = new Proxy(themeBase, { get: (o, p) => (p in o ? o[p] : '#888888') });

  // Mirrors the ctx dev-tools/check_sel_render.cjs builds for these plugins.
  return {
    React,
    update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: '', selHubTool: '',
    addToast: noop, awardXP: noop, getXP: () => 0,
    announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k,
    theme, isDark: false, isContrast: false,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: null, selectedVoice: null, activeSessionCode: null,
    icons: iconsProxy,
    gradeLevel: '5th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (text) => React.createElement('span', { className: 'sr-only' }, text),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
}

// Stateful wrapper so the tool's setLabToolData drives a real re-render, which
// is what makes the keyboard assertions meaningful rather than static.
function Harness() {
  const [labToolData, setLabToolData] = React.useState({});
  const ctx = React.useMemo(() => {
    const base = makeBaseCtx();
    base.labToolData = labToolData;
    base.toolData = labToolData;
    base.setLabToolData = setLabToolData;
    base.setToolData = setLabToolData;
    // Unknown ctx reads resolve to a noop, matching the render gate's proxy.
    return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  }, [labToolData]);
  return toolConfig.render(ctx);
}

beforeAll(async () => {
  React = require2(resolve(modulesDir, 'react'));
  ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require2(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require2(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.callGemini = null;

  const registry = {};
  window.SelHub = {
    _registry: registry,
    _order: [],
    registerTool(id, config) { config.id = id; registry[id] = config; },
    isRegistered: (id) => !!registry[id],
    renderTool(id, ctx) { const t = registry[id]; return t && t.render ? t.render(ctx) : null; },
  };

  // Load the real plugin; it self-registers against window.SelHub.
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(sourcePath, 'utf8')).call(window);
  toolConfig = registry.disabilityVoices;

  host = document.createElement('div');
  document.body.appendChild(host);
  await act(async () => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Harness));
  });
});

afterAll(async () => {
  if (root) await act(async () => root.unmount());
  if (host && host.parentNode) host.parentNode.removeChild(host);
});

const tabs = () => Array.from(host.querySelectorAll('[role="tab"]'));
const selectedIndex = () => tabs().findIndex((t) => t.getAttribute('aria-selected') === 'true');

async function pressKey(el, key) {
  await act(async () => {
    el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

describe('Disability Voices tab accessibility', () => {
  it('registers the tool and renders four tabs inside a tablist', () => {
    expect(toolConfig).toBeTruthy();
    expect(host.querySelector('[role="tablist"]')).toBeTruthy();
    expect(tabs()).toHaveLength(TAB_IDS.length);
  });

  it('links the selected tab to a rendered panel that points back at it', () => {
    const tab = tabs()[selectedIndex()];
    const controls = tab.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(tab.id).toBeTruthy();
    const panel = host.querySelector(`#${controls}`);
    expect(panel, `panel ${controls} must exist for the selected tab`).toBeTruthy();
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
  });

  it('gives every tab an id and an aria-controls target', () => {
    for (const tab of tabs()) {
      expect(tab.id, 'every tab needs an id for aria-labelledby').toBeTruthy();
      expect(tab.getAttribute('aria-controls')).toBeTruthy();
    }
  });

  it('exposes exactly one tab to the tab sequence (roving tabindex)', () => {
    const focusable = tabs().filter((t) => t.getAttribute('tabindex') === '0');
    expect(focusable).toHaveLength(1);
    expect(focusable[0].getAttribute('aria-selected')).toBe('true');
  });

  it('moves selection with ArrowRight and wraps past the last tab', async () => {
    const start = selectedIndex();
    await pressKey(tabs()[start], 'ArrowRight');
    expect(selectedIndex()).toBe((start + 1) % TAB_IDS.length);

    // One more full lap returns to the same tab, proving the wrap.
    for (let i = 0; i < TAB_IDS.length; i += 1) {
      await pressKey(tabs()[selectedIndex()], 'ArrowRight');
    }
    expect(selectedIndex()).toBe((start + 1) % TAB_IDS.length);
  });

  it('supports ArrowLeft, Home and End', async () => {
    await pressKey(tabs()[selectedIndex()], 'End');
    expect(selectedIndex()).toBe(TAB_IDS.length - 1);

    await pressKey(tabs()[selectedIndex()], 'ArrowLeft');
    expect(selectedIndex()).toBe(TAB_IDS.length - 2);

    await pressKey(tabs()[selectedIndex()], 'Home');
    expect(selectedIndex()).toBe(0);
  });

  it('leaves selection alone for keys outside the tab pattern', async () => {
    const before = selectedIndex();
    await pressKey(tabs()[before], 'a');
    expect(selectedIndex()).toBe(before);
  });

  it('announces the new section through the live region the tool creates', async () => {
    const region = document.getElementById('allo-live-disvoices');
    expect(region, 'the tool appends this region at load').toBeTruthy();
    expect(region.getAttribute('aria-live')).toBe('polite');

    const target = tabs()[(selectedIndex() + 1) % TAB_IDS.length];
    await act(async () => { target.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 80)); });

    expect(region.textContent).not.toBe('');
    expect(region.textContent.toLowerCase()).toContain('section shown');
  });

  it('has no serious or critical axe violations in any section', async () => {
    for (let i = 0; i < TAB_IDS.length; i += 1) {
      await act(async () => { tabs()[i].click(); });
      const results = await axe.run(host, AXE_OPTS);
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => v.id), `section ${TAB_IDS[i]}`).toEqual([]);
    }
  });
});

describe('Disability Voices content integrity', () => {
  const source = readFileSync(sourcePath, 'utf8');

  it('keeps source and public mirrors byte-identical', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source);
  });

  it('does not present the two Kupferstein percentages as a like-for-like comparison', () => {
    // The original copy read "46% ... met PTSD criteria, vs 72% of non-exposed",
    // inverting the study's own finding. 46% is the symptomatic share of the
    // EXPOSED group; 72% is the ASYMPTOMATIC share of the non-exposed group.
    expect(source).not.toContain('vs 72% of non-exposed');
    expect(source).toContain('72% of non-exposed respondents were asymptomatic');
    expect(source).toContain('46% of ABA-exposed respondents indicated post-traumatic stress symptoms');
  });

  it('discloses the publisher Expression of Concern where the study is cited', () => {
    expect(source).toContain('Expression of Concern');
    expect(source).toContain('3 December 2025');
    expect(source).toContain('investigation is unresolved');
    expect(source).toContain('Leaf et al.');
  });

  it('no longer claims the ABA-harm figure is settled', () => {
    expect(source).not.toContain('is now widely accepted within the field');
    expect(source).toContain('contested claim, not a settled finding');
  });

  it('quotes Kupferstein verbatim rather than paraphrasing her in quotation marks', () => {
    // The card shipped an invented quote: "...significantly more likely to meet
    // PTSD diagnostic criteria than those who were not exposed. This is data,
    // not opinion." That sentence is in neither the paper nor its abstract. On a
    // tool whose stated standard is a documented, verifiable quote from a named
    // living person, an editorialised paraphrase in quotation marks is the most
    // damaging error available, so it gets a permanent guard.
    expect(source).not.toContain('This is data, not opinion');
    expect(source).toContain('Nearly half (46 percent) of the ABA-exposed respondents met the diagnostic threshold for PTSD');
  });

  it('quotes Milton from his own paper rather than paraphrasing him', () => {
    // Verified against the version of record in the Kent Academic Repository.
    expect(source).not.toContain('The autistic person and the non-autistic person are equally responsible');
    expect(source).toContain('it is not a singular problem located in any one person');
  });

  it('quotes Berne from the working draft rather than paraphrasing her', () => {
    expect(source).not.toContain('We will not leave our most vulnerable behind as we move forward');
    expect(source).toContain('Collective Access, that as brown and queer crips');
  });

  it('renders no text below the hub 12px floor', () => {
    expect(source.match(/fontSize: (?:9|10|11)\b/g) || []).toEqual([]);
  });
});

describe('Advocate naming', () => {
  const CURRENT = 'Ly Xīnzhèn M. Zhǎngsūn Brown';
  const FORMER = 'Lydia X. Z. Brown';
  const files = [
    'sel_hub/sel_tool_disabilityvoices.js',
    'sel_hub/sel_hub_module.js',
    'sel_hub/sel_tool_advocacy.js',
  ];

  // This advocate changed their name publicly and uses they/them. A hub built
  // on "nothing about us without us" naming a living disabled person by a name
  // they no longer use is a content defect, not a style nit. The 2017 anthology
  // keeps its printed byline so students can still find the book, but every
  // reference to the PERSON uses the name they use now.
  it.each(files)('uses the current name in %s', (rel) => {
    const text = readFileSync(resolve(process.cwd(), rel), 'utf8');
    expect(text).toContain(CURRENT);
  });

  it('keeps the former name only as a bibliographic byline or an explicit note', () => {
    const text = readFileSync(sourcePath, 'utf8');
    for (const line of text.split('\n')) {
      if (!line.includes(FORMER)) continue;
      const isCredit = line.includes('(eds.)') || line.includes('then-name');
      const isNote = line.includes('published as Lydia X. Z. Brown through 2020');
      expect(isCredit || isNote, `unexplained former name: ${line.trim().slice(0, 90)}`).toBe(true);
    }
  });

  it('does not attribute the movement slogan to a single person', () => {
    const advocacy = readFileSync(resolve(process.cwd(), 'sel_hub/sel_tool_advocacy.js'), 'utf8');
    // "Nothing about us without us" predates autistic self-advocacy; this hub's
    // own Ne'eman card says so. Crediting it to one mentor contradicts that.
    expect(advocacy).not.toContain("mentor: 'Lydia X.Z. Brown', context: 'On the autistic community', quote: 'Nothing about us without us.'");
  });
});
