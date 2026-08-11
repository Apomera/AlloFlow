import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_organismid.js';
const TOOL_ID = 'organismId';

let config;

beforeEach(() => {
  resetStemLab();
  config = loadTool(TOOL_FILE, TOOL_ID);
});

function renderView(activeView, state = {}, ctx = {}) {
  return renderTool(TOOL_ID, { organismId: { activeView, ...state } }, ctx);
}

describe('Taxonomy Explorer registration', () => {
  it('registers a complete, discoverable STEM Lab plugin contract', () => {
    expect(config).toMatchObject({
      id: TOOL_ID,
      label: 'Taxonomy Explorer',
      title: 'Taxonomy Explorer',
      category: 'science',
      color: 'emerald',
      ready: true,
    });
    expect(config.render).toBeTypeOf('function');
    expect(config.aliases).toEqual(expect.arrayContaining([
      'taxonomy', 'classification', 'organism id', 'cladistics', 'lookalikes',
    ]));
  });
});

describe('Photo identification stays gated', () => {
  // The engine in dev-tools/organism-id-engine/ carries 24 DEADLY + 8 CONTACT
  // hazard entries, none of them expert-reviewed. This test is the lock: the
  // photo path may not quietly light up because someone flipped a constant.
  it('reports the photo path as disabled', () => {
    expect(config.testHooks.photoIdEnabled()).toBe(false);
  });

  it('explains the hold rather than showing a broken capture screen', () => {
    const html = renderView('photo');
    expect(html).toMatch(/not switched on yet/i);
    expect(html).toMatch(/mycologist|naturalist/i);
    expect(html).not.toMatch(/take a photo|upload|choose file/i);
  });

  it('never tells a student anything is safe to eat or touch', () => {
    // Negation-aware, like the engine's own reassurance firewall. The tool DOES
    // say "not the same as 'safe to eat'" — that is the warning, not a breach.
    // A naive substring check reads that as a violation and, worse, would pass
    // a tool that dropped the negation.
    const NEGATORS = /\b(not|never|no|nothing|isn|aren|cannot|can't|n't)\b/i;
    const CLAIM = /safe to (eat|touch|handle)|you can eat|edible from a photo/gi;

    // Premise guard: if the phrase never appears anywhere, the scan below is
    // vacuous and would keep passing after the copy was gutted.
    expect(renderView('groups')).toMatch(/not the same as (&quot;|&#x27;|["'])?safe to eat/i);

    for (const view of ['tree', 'groups', 'lookalikes', 'learn', 'photo']) {
      const html = renderView(view);
      let match;
      while ((match = CLAIM.exec(html)) !== null) {
        const lead = html.slice(Math.max(0, match.index - 90), match.index);
        expect(
          NEGATORS.test(lead),
          `${view} view: unnegated safety claim "${match[0]}" after "...${lead.slice(-60)}"`,
        ).toBe(true);
      }
    }
  });

  it('carries the standing field rule on every view', () => {
    for (const view of ['tree', 'groups', 'lookalikes', 'learn', 'photo']) {
      expect(renderView(view), `${view} view`).toMatch(/Never eat, taste, or handle a wild organism/);
    }
  });
});

describe('Taxonomy data integrity', () => {
  it('every tier used by the data has a label and a legend colour', () => {
    // A tier present in TREE or EDGES but missing from TIER_ORDER renders a
    // blank chip and drops out of the legend entirely.
    const used = config.testHooks.tiersInData();
    const known = config.testHooks.tierOrder;
    for (const tier of used) expect(known, `tier ${tier}`).toContain(tier);
  });

  it('keeps the death cap and the portobello in the same order but different families', () => {
    // The pedagogical core: the lethal split appears at family, not kingdom.
    const amanita = config.testHooks.lineageOf('Amanita');
    const agaricus = config.testHooks.lineageOf('Agaricus');
    expect(amanita).toContain('Agaricales');
    expect(agaricus).toContain('Agaricales');
    expect(amanita).toContain('Amanitaceae');
    expect(agaricus).toContain('Agaricaceae');
    expect(config.testHooks.nodeByName('Amanita').tier).toBe('DEADLY');
  });

  it('groups the amanita confusion set so the lookalikes cross-link', () => {
    const members = config.testHooks.groupMembers('amanita', 'Amanita');
    expect(members).toEqual(expect.arrayContaining(['Agaricus', 'Lycoperdon']));
  });

  it('keeps Squamata keyed to class, the bug the explainer teaches from', () => {
    // GBIF ranks Squamata as a CLASS with an empty order. When the engine's
    // rule was keyed to order it matched nothing and snakes lost their warning.
    expect(config.testHooks.nodeByName('Squamata').rank).toBe('class');
  });

  it('has a lookalike pair for every deadly confusion the tree names', () => {
    expect(config.testHooks.edgeCount).toBeGreaterThanOrEqual(12);
    expect(config.testHooks.edgeTiers.filter((t) => t === 'DEADLY').length).toBeGreaterThanOrEqual(9);
  });
});

describe('Views render', () => {
  it.each([
    ['tree', /Tree Explorer|Amanita/],
    ['groups', /Can kill/],
    ['lookalikes', /Tell:/],
    ['learn', /Ranks are conventions/],
  ])('renders the %s view without throwing', (view, signature) => {
    const html = renderView(view);
    expect(html).toBeTruthy();
    expect(html).toMatch(signature);
  });

  it('renders in dark mode without losing its text', () => {
    const html = renderView('tree', {}, { isDark: true });
    expect(html).toMatch(/Amanita/);
    // A hardcoded dark colour paired with a light background is the KitchenLab
    // failure mode; assert the tool actually swapped palettes.
    expect(html).toMatch(/#0f130e|#e6eadf/);
  });

  it('renders in high-contrast mode', () => {
    const html = renderView('groups', {}, { isContrast: true });
    expect(html).toMatch(/Can kill/);
  });

  it('parses the tiny b/i markup instead of leaking raw tags', () => {
    const html = renderView('learn');
    expect(html).not.toMatch(/&lt;b&gt;|&lt;i&gt;/);
    expect(html).toMatch(/<strong>|<em>/);
  });
});
