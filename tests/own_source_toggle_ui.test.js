// The "Use my own sources" toggle (2026-09-16).
//
// These pin the WIRING, which is where this kind of feature actually breaks: a
// control can render perfectly and still do nothing because one link in the
// prop chain was missed. Every assertion reads the shipped file, so removing a
// link fails here rather than silently shipping a dead checkbox.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('the toggle is offered where source material is generated', () => {
  it('renders in the source generation panel, next to web search', () => {
    const panel = read('view_misc_panels_source.jsx');
    // Same card as the web-search toggle: this is the same kind of choice.
    const verifyAt = panel.indexOf("t('input.verify_facts')");
    const ownAt = panel.indexOf("t('input.use_my_sources')");
    expect(verifyAt).toBeGreaterThan(-1);
    expect(ownAt).toBeGreaterThan(verifyAt);
    expect(panel).toMatch(/id="useOwnSources"/);
    expect(panel).toMatch(/checked=\{!!useOwnSources\}/);
  });

  it('renders in the Quick Start wizard too', () => {
    const wiz = read('quickstart_source.jsx');
    expect(wiz).toMatch(/id="wiz-own-sources"/);
    expect(wiz).toMatch(/checked=\{localData\.useOwnSources\}/);
    expect(wiz).toMatch(/useOwnSources: false,/);
  });

  it('stays hidden until the teacher has actually imported something', () => {
    // An always-visible control that cannot do anything is worse than no
    // control, so both surfaces gate on a real count.
    expect(read('view_misc_panels_source.jsx')).toMatch(/ownSourceCount !== null && ownSourceList.length > 0 &&/);
    expect(read('quickstart_source.jsx')).toMatch(/\{wizOwnSourceCount > 0 && \(/);
  });

  // Counting used to be inlined in each panel. It moved into own_sources_module
  // because all three copies opened the Lumen store the SAME WRONG WAY — passing
  // the scope string as the whole options bag, so the store had no adapter and
  // loaded nothing. Assert the behaviour where it now lives.
  it('counts only ACTIVE sources, matching what retrieval will actually search', () => {
    expect(read('own_sources_module.js')).toMatch(/source\.active !== false/);
  });

  it('both panels count through the shared helper rather than opening the store themselves', () => {
    for (const f of ['view_misc_panels_source.jsx', 'quickstart_source.jsx']) {
      expect(read(f), f).toMatch(/countSources\(/);
      expect(read(f), `${f} should not hand-roll the store`).not.toMatch(/createProjectStore\(/);
    }
  });

  it('reads the count from local storage only — never the network', () => {
    const helper = read('own_sources_module.js');
    expect(helper).toMatch(/createProjectStore/);
    expect(helper).not.toMatch(/fetch\(|XMLHttpRequest/);
  });
});

describe('the toggle is wired all the way to retrieval', () => {
  it('is held as state in the host', () => {
    expect(read('AlloFlowANTI.txt')).toMatch(/const \[useOwnSources, setUseOwnSources\] = useState\(false\)/);
  });

  it('reaches the panel through every link in the prop chain', () => {
    // host shell -> sidebar shell -> SourceGenPanel. Drop any one and the
    // checkbox renders but never changes what the model reads.
    expect(read('AlloFlowANTI.txt'), 'host passes to sidebar shell')
      .toMatch(/useOwnSources, setUseOwnSources,/);
    const sidebar = read('view_sidebar_panels_source.jsx');
    expect(sidebar, 'sidebar destructures it').toMatch(/urlToFetch, useOwnSources, setUseOwnSources/);
    expect(sidebar, 'sidebar forwards it to SourceGenPanel').toMatch(/t, targetStandards, useOwnSources, setUseOwnSources/);
    expect(read('view_misc_panels_source.jsx'), 'panel destructures it')
      .toMatch(/targetStandards, useOwnSources, setUseOwnSources/);
  });

  it('reaches the generator through its state bag', () => {
    expect(read('AlloFlowANTI.txt')).toMatch(/selectedFont, includeSourceCitations, useOwnSources,/);
    const engine = read('content_engine_source.jsx');
    expect(engine).toMatch(/useOwnSources = s\.useOwnSources;/);
  });

  it('gates retrieval on the toggle, so it is off by default', () => {
    const engine = read('content_engine_source.jsx');
    expect(engine).toMatch(/if \(effUseOwnSources\) \{/);
    // The retrieval call must sit INSIDE that gate, not beside it.
    const gateAt = engine.indexOf('if (effUseOwnSources) {');
    const callAt = engine.indexOf('retrieveOwnSourceEvidence(effTopic', gateAt);
    expect(callAt).toBeGreaterThan(gateAt);
    expect(callAt - gateAt).toBeLessThan(200);
  });

  it('survives the build into the shipped modules', () => {
    // The .jsx files are inputs; these are what the browser loads.
    expect(read('view_misc_panels_module.js')).toMatch(/useOwnSources/);
    expect(read('quickstart_module.js')).toMatch(/wiz-own-sources/);
    expect(read('content_engine_module.js')).toMatch(/effUseOwnSources/);
  });
});

describe('the toggle has real, translatable copy', () => {
  it('defines every key the UI asks for', () => {
    const strings = JSON.parse(read('ui_strings.js'));
    for (const key of ['use_my_sources', 'use_my_sources_desc', 'use_my_sources_none']) {
      expect(strings.input[key], key).toBeTruthy();
    }
  });

  it('says where retrieval happens, because that is the privacy claim', () => {
    const strings = JSON.parse(read('ui_strings.js'));
    expect(strings.input.use_my_sources_desc).toMatch(/on this device/i);
  });

  it('keeps the two ui_strings copies in step', () => {
    expect(read('ui_strings.js')).toBe(read('desktop/web-app/public/ui_strings.js'));
  });
});
