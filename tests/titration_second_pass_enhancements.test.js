import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_titration.js';
const source = fs.readFileSync(sourcePath, 'utf8');

const model = (() => {
  function declarationBody(name, nextAnchor) {
    const start = source.indexOf('var ' + name + ' =');
    const end = source.indexOf(nextAnchor, start);
    if (start < 0 || end < 0) throw new Error('Missing ' + name + ' source anchor');
    return source.slice(start, end);
  }

  const hazardDecl = declarationBody('chemHazards', 'var presetHazardKeys');
  const helperStart = source.indexOf('function buretteReading(');
  const helper = helperStart < 0 ? '' : source.slice(helperStart, source.indexOf('\n}', helperStart) + 2);
  const t = (key, fallback) => fallback;
  return new Function('__alloT', hazardDecl + helper + `; return {
    chemHazards,
    buretteReading: typeof buretteReading === 'function' ? buretteReading : null
  };`)(t);
})();

function renderState(state = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'titrate' }, state),
  });
  return host;
}

function workingStrength(hazard) {
  return hazard.working || hazard.workingSolution || hazard.workingStrength
    || hazard.concentration || hazard.simulated || '';
}

function classificationProfile(hazard) {
  return hazard.classification || hazard.referenceClassification || hazard.sdsProfile
    || hazard.profile || '';
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'titrationLab');
});

describe('Titration Lab concentration-aware hazard communication', () => {
  it('stores the simulated working strength separately from its reference classification', () => {
    const expectedStrengths = {
      HCl: /0\.1\s*M/i,
      NaOH: /0\.1\s*M/i,
      'CH₃COOH': /0\.1\s*M/i,
      'NH₃': /0\.1\s*M/i,
      'H₃PO₄': /0\.1\s*M/i,
      'KMnO₄': /0\.020?\s*M/i,
      'FeSO₄': /0\.020?\s*M/i,
      'H₂SO₄': /1\s*M/i,
      Antacid: /formulation|mixture|not specified/i,
    };

    for (const [key, strengthPattern] of Object.entries(expectedStrengths)) {
      const hazard = model.chemHazards[key];
      expect(hazard, key + ' hazard record').toBeTruthy();
      expect(String(workingStrength(hazard)), key + ' working strength').toMatch(strengthPattern);
      expect(String(classificationProfile(hazard)), key + ' classification profile').toMatch(/SDS|supplier|profile|not specified/i);
    }
  });

  it('shows working-solution context before the hazard profile in the expandable cards', () => {
    const root = renderState({ presetId: 'wa_sb', showHazards: true });
    const panel = root.querySelector('#titration-hazards-panel');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toMatch(/simulated|working solution/i);
    expect(panel.textContent).toMatch(/0\.1\s*M/i);
    expect(panel.textContent).toMatch(/reference profile|example supplier|exact.*SDS/i);
  });

  it('does not assign concentrated-acetic-acid flammability to the simulated 0.1 M solution', () => {
    const acetic = JSON.stringify(model.chemHazards['CH₃COOH']);
    expect(acetic).not.toMatch(/H226|GHS02|flammable liquid|flammable vapor|\uD83D\uDD25|🔥/i);
  });

  it('does not assign solid or concentrated-permanganate statements to the simulated 0.02 M solution', () => {
    const permanganate = JSON.stringify(model.chemHazards['KMnO₄']);
    expect(permanganate).not.toMatch(/H272|H302|H314|H410|GHS03|GHS05|GHS06/i);
    expect(permanganate).toMatch(/H412|aquatic life with long lasting effects/i);
  });

  it('does not use skull or biohazard glyphs as generic chemical-hazard badges', () => {
    expect(JSON.stringify(model.chemHazards)).not.toMatch(/☠|☣/u);

    const root = renderState({ presetId: 'sa_sb', showHazards: true });
    expect(root.querySelector('#titration-hazards-panel')).not.toBeNull();
    expect(root.textContent).not.toMatch(/☠|☣/u);

    const briefing = renderState({
      safetyChecked: false,
      safetyStation: 3,
      safetyChecks: { goggles: true, gloves: true, coat: true, shoes: true },
    });
    expect(briefing.textContent).not.toMatch(/☠|☣/u);
  });
});

describe('Titration Lab redox endpoint method', () => {
  it('hides acid-base indicator choices and names the permanganate endpoint signal', () => {
    const root = renderState({ presetId: 'redox_kmno4' });
    expect(root.querySelectorAll('button[aria-label^="Select indicator:"]')).toHaveLength(0);
    expect(root.textContent).toMatch(/ENDPOINT SIGNAL/i);
    expect(root.textContent).toMatch(/permanganate[^.]{0,80}self-indicat|self-indicat[^.]{0,80}permanganate/i);
  });

  it('keeps indicator selection available for acid-base titrations', () => {
    const root = renderState({ presetId: 'sa_sb' });
    expect(root.querySelectorAll('button[aria-label^="Select indicator:"]').length).toBeGreaterThan(2);
  });
});

describe('Titration Lab authentic burette record', () => {
  it('teaches that a titre is calculated from separately recorded initial and final readings', () => {
    expect(source).toMatch(/record (?:an? )?initial reading/i);
    expect(source).toMatch(/record (?:the )?final reading/i);
    expect(source).toMatch(/tit(?:re|er)\s*=\s*final\s*(?:\\u2212|−|-)\s*initial/i);
  });

  it('renders separate initial reading, final reading, and calculated titre fields in the graded challenge', () => {
    const root = renderState({
      labTab: 'challenge',
      chMode: 'graded',
      gRun: 7,
      gInitialTrue: 6.42,
      gInitialLocked: true,
      gInitialRecorded: 6.42,
      gInitialEyeCm: 0,
      gEyeCm: 0,
      gVb: 12.37,
      gTrials: [],
    });

    const readingPanel = root.querySelector('#titration-burette-readings');
    expect(readingPanel).not.toBeNull();
    expect(readingPanel.textContent).toMatch(/Initial burette reading/i);
    expect(readingPanel.textContent).toMatch(/Final burette reading/i);
    expect(readingPanel.textContent).toMatch(/Titre\s*=\s*final\s*[−-]\s*initial/i);
    expect(readingPanel.textContent).toContain('6.42 mL');
    expect(readingPanel.textContent).toContain('18.79 mL');
    expect(readingPanel.textContent).toContain('12.37 mL');
  });

  it.skipIf(!model.buretteReading)('calculates an absolute final reading from a non-zero initial reading', () => {
    const finalReading = model.buretteReading(7.35, 12.48, 0);
    expect(finalReading).toBeCloseTo(19.83, 2);
    expect(finalReading - 7.35).toBeCloseTo(12.48, 2);
  });
});
