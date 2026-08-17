// STEM Lab Create tab: the Generate button generates (fleet follow-up, 2026-08-17).
//
// Enhancement #1 from docs/math_create_migration_plan.md. The button's onClick
// used to stage mathMode and navigate to the math view without ever calling
// handleGenerateMath — the teacher was dropped there to find the sidebar's
// Generate on their own. The staging-vs-state race that likely caused the
// omission (a freshly set mode is not yet readable from state) is what
// handleGenerateMath's modeOverride parameter (AlloFlowANTI.txt, GenerationHelpers
// contract: (inputOverride, switchView, modeOverride)) exists to solve.
//
// Enhancement #3: "From My Content" attaches the lesson source automatically
// inside handleGenerateMath (gated on useMathSourceContext, a MathPanel checkbox
// defaulting on), but the UI asked teachers to paste content the app already
// holds. The mode now states which of the three truths applies.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let stem;
let anti;

beforeAll(() => {
  stem = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
});

function generateOnClick() {
  const start = stem.indexOf('let resolvedMode;');
  const end = stem.indexOf('disabled: !mathInput.trim()', start);
  if (start < 0 || end < 0) throw new Error('Generate onClick not found');
  return stem.slice(start, end);
}

describe('the Generate button generates', () => {
  it('resolves the mode once and hands it to handleGenerateMath as modeOverride', () => {
    const click = generateOnClick();
    expect(click).toContain('handleGenerateMath(mathInput, true, resolvedMode);');
    // and still writes the resolved mode to state so the sidebar reflects it
    expect(click).toContain('setMathMode(resolvedMode);');
  });

  it('keeps the same mode resolution the old staging code used', () => {
    const click = generateOnClick();
    expect(click).toContain("resolvedMode = 'Word Problems from Source';");
    expect(click).toContain("resolvedMode = 'Freeform Builder';");
    expect(click).toContain("? 'Problem Set Generator' : mathMode;");
  });

  it('closes the modal on generate, and degrades to the old navigation on an older host', () => {
    const click = generateOnClick();
    expect(click).toContain("if (typeof handleGenerateMath === 'function') {");
    expect(click).toContain('setShowStemLab(false);');
    expect(click).toContain("setActiveView('math');"); // the else branch
  });

  it('modeOverride is a real parameter of the host contract, not a guess', () => {
    expect(anti).toContain('const handleGenerateMath = async (inputOverride = null, switchView = true, modeOverride = null) => {');
  });
});

describe('"From My Content" tells the truth about source attachment', () => {
  it('renders one of three states instead of asking for a paste', () => {
    for (const key of ['content_source_attached', 'content_source_off', 'content_source_none']) {
      expect(stem).toContain("t('stem.solver." + key + "')");
    }
    expect(stem).toContain("stemLabCreateMode === 'content' && ");
  });

  it('reads the real flag and the real source signal from the host bag', () => {
    // Host side: both are threaded read-only into the StemLab bag.
    const bag = anti.slice(anti.indexOf('React.createElement(StemLab, {'), anti.indexOf('React.createElement(StemLab, {') + 7000);
    expect(bag).toContain('useMathSourceContext, hasSourceOrAnalysis,');
    // Module side: destructured, and the hint branches on both.
    expect(stem).toContain('useMathSourceContext !== false && hasSourceOrAnalysis');
  });

  it('every hint string has a real ui_strings key in both copies', () => {
    const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    const pub = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8'));
    for (const key of ['content_source_attached', 'content_source_off', 'content_source_none']) {
      expect(typeof ui.stem.solver[key], 'stem.solver.' + key).toBe('string');
      expect(pub.stem.solver[key]).toBe(ui.stem.solver[key]);
    }
  });
});

describe('mirrors', () => {
  it('all three stem_lab_module copies are byte-identical', () => {
    for (const mirror of ['desktop/web-app/public/stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js']) {
      expect(readFileSync(mirror, 'utf8')).toBe(stem);
    }
  });
});
