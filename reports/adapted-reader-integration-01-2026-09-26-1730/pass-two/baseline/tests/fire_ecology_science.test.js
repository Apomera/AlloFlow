import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderFireEcology(state = {}) {
  return renderTool('fireEcology', { fireEcology: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fireecology.js', 'fireEcology');
});

describe('Fire Ecology prescribed-fire safety boundary', () => {
  it('presents the weather sliders as a classroom comparison, not authorization', () => {
    const html = renderFireEcology({ tab: 'burnPlan' });
    expect(html).toContain('simplified classroom model');
    expect(html).toContain('site-specific approved plan and qualified personnel');
    expect(html).toContain('A high score is not authorization');
    expect(html).toContain('Compare Classroom Conditions');
    expect(html).not.toContain('GO — Excellent conditions for cultural burning');
  });

  it('exposes a completed comparison as a live status with a named score graphic', () => {
    const html = renderFireEcology({
      tab: 'burnPlan',
      burnResult: {
        score: 100,
        notes: ['Example classroom result'],
        verdict: { label: 'Four classroom ranges matched', color: '#22c55e', icon: 'OK' }
      }
    });
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="img"');
    expect(html).toContain('Classroom condition score: 100 out of 100');
  });
});

describe('Fire Ecology science contracts', () => {
  it('uses a short interval for the short-interval flag', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    expect(source).toContain("if (iq.interval < 5) state = 'typeConv';");
    expect(source).not.toContain("iq.interval > 70 && iq.fuel < 3");
    expect(source).toContain('A very short interval may alter some communities');
  });

  it('states the limits of the arbitrary regime index', () => {
    const html = renderFireEcology({
      tab: 'regimeHunt',
      regimeHunt: { fuel: 2, interval: 3, drought: 2, log: [] }
    });
    expect(html).toContain('arbitrary classroom index');
    expect(html).toContain('not a fire-behavior or ecosystem forecast');
    expect(html).toContain('labels are inquiry prompts, not predictions');
    expect(html).toContain('Very short interval flag');
  });

  it('describes exclusion risk conditionally rather than as inevitable', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    expect(source).toContain('can increase potential fire severity under conducive conditions');
    expect(source).toContain('may contribute to more severe fire behavior');
    expect(source).not.toContain('making catastrophic wildfire inevitable');
  });

  it('describes fuel moisture and succession as multivariable processes', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    expect(source).toContain('Fuel moisture is one major influence on fire behavior');
    expect(source).toContain('pathways vary with ecosystem, burn severity, climate, soils');
  });
});

describe('Fire Ecology quiz accessibility', () => {
  it('gives each answer button a distinct accessible name', () => {
    const html = renderFireEcology({ tab: 'quiz' });
    const answerNames = [...html.matchAll(/aria-label="(Answer [A-D]: [^"]+)"/g)].map((match) => match[1]);
    expect(answerNames).toHaveLength(4);
    expect(new Set(answerNames).size).toBe(4);
    expect(answerNames.map((name) => name.slice(0, 8))).toEqual([
      'Answer A', 'Answer B', 'Answer C', 'Answer D'
    ]);
    expect(html).not.toContain('aria-label="Select Answer"');
  });
});

describe('Fire Ecology cross-screen number agreement', () => {
  // The Carbon Calculator models the cultural-burn / wildfire ratio and the quiz states it
  // in words. Those are two derivations of one fact, so they have to be checked against
  // each other rather than maintained by hand: the quiz previously keyed "5-10x LESS"
  // while CARBON_DATA implied about 13x.
  function carbonPerAcre(source, key) {
    const block = source.slice(source.indexOf(`${key}: {`, source.indexOf('var CARBON_DATA')));
    return Number(block.match(/co2PerAcre:\s*([0-9.]+)/)[1]);
  }

  it('keys a quiz answer that matches the carbon model it points at', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    const ratio = carbonPerAcre(source, 'wildfire') / carbonPerAcre(source, 'culturalBurn');
    expect(ratio).toBeGreaterThan(7);
    expect(ratio).toBeLessThan(20);
    expect(source).toContain('Cultural burning releases roughly ten times less carbon per acre');
    expect(source).not.toContain('5-10x LESS carbon per acre');
  });

  it('gives every quiz item an explanation and an activity to revisit', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    const bank = source.slice(source.indexOf('var QUIZ_QUESTIONS = ['), source.indexOf('// The authored bank put'));
    const questions = (bank.match(/\{ q: '/g) || []).length;
    const whys = (bank.match(/ why: '/g) || []).length;
    expect(questions).toBeGreaterThan(0);
    expect(whys).toBe(questions);
    expect(source).toContain("'data-fe-quiz-why'");
  });

  it('moves simulator carbon in the direction the carbon ledger claims', () => {
    // CARBON_DATA calls a cultural burn a sink over ten years and a prescribed burn a wash.
    // The simulator advances in ten-year steps, so its carbon term has to agree: it used to
    // subtract on every burn and add only for suppression, which taught the opposite.
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    const ledger = source.slice(source.indexOf('var CARBON_DATA'));
    const net = (key) => Number(ledger.slice(ledger.indexOf(`${key}: {`)).match(/netCarbon10yr:\s*(-?[0-9.]+)/)[1]);
    expect(net('culturalBurn')).toBeLessThan(0);
    expect(net('prescribedBurn')).toBe(0);

    const cultural = source.slice(source.indexOf("if (action === 'culturalBurn')"), source.indexOf("} else if (action === 'suppress')"));
    expect(cultural).toContain('newSim.carbonStored = clamp(s.carbonStored + 2, 0, 200)');
    const prescribed = source.slice(source.indexOf("} else if (action === 'prescribe')"), source.indexOf('// Natural recovery'));
    expect(prescribed).toContain('newSim.carbonStored = clamp(s.carbonStored, 0, 200)');
    expect(prescribed).not.toContain('s.carbonStored - ');
  });

  it('explains a greyed-out mosaic technique in text, not only in a tooltip', () => {
    // Disabled buttons are not focusable, so a title attribute is unreachable by keyboard
    // and skipped by screen readers: the Cold Season rule was invisible to those users.
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    expect(source).toContain("'data-fe-technique-reasons'");
    expect(source).toContain('Greyed out');
    expect(source).not.toContain("' (only available in '");
  });

  it('explains the 3D toggle when no WebGL viewer is available', () => {
    // The harness provides no window.StemLab.makeOrbitViewer, which is the same situation as
    // a device without WebGL: the toggle is disabled, so the reason has to be in the page.
    const html = renderFireEcology({ tab: 'simulator' });
    expect(html).toContain('data-fe-no3d');
    expect(html).toContain('needs WebGL');
    expect(html).toContain('The 2D cross-section runs the same model');
    expect(html).toContain('3D landscape, unavailable on this device');
  });

  it('ships the reviewed wording in ui_strings, which overrides the fallbacks', () => {
    // The tool renders t('key', 'fallback'), and ui_strings.js wins wherever it has the key.
    // The vitest harness renders with fallbacks only, so every assertion about the source
    // text is blind to what a student actually reads. These check the shipped bank.
    const bank = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.fireecology;
    const all = Object.values(bank).join('\n');

    // Retired by the burn-safety rework: the planner must never read as authorization.
    expect(all).not.toContain('GO — Excellent conditions for cultural burning');
    expect(all).not.toContain('NO-GO — Conditions unsafe for burning');
    expect(all).not.toContain('Score ≥ 85 = GO');
    expect(bank.evaluate_burn_plan).toBe('Compare Classroom Conditions');

    // Retired by the science-integrity rework of the fire regime labels.
    expect(all).not.toContain('Decades of fire-suppression. Next ignition is bad.');
    expect(all).not.toContain('High fuel + drought + suppression = catastrophic event.');
    expect(all).not.toContain('Frequent low-fuel burns convert forest permanently.');
    expect(bank.high_fuel_drought_suppression_catastro).toContain('not a forecast');
  });

  it('keeps ui_strings and the source fallbacks in step', () => {
    // Nine keys are deliberately richer in ui_strings (emoji markers, fuller aria text, and
    // two corrected during this work). Everything else must match, or the tool says one
    // thing in test and another in the browser.
    const RICHER = new Set([
      'a_real_indigenous_approach_is_patchwor', 'camp_fire_2018_black_saturday_2009_car',
      'fire_regime_discovery', 'fuel_load', 'biodiversity', 'fireecology_visualization',
      'forest_visualization_showing_current_f', 'forest_health_over_time', 'event_log'
    ]);
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    const bank = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.fireecology;
    const norm = (x) => x
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[—–]/g, '-').replace(/ /g, ' ')
      .replace(/\s+/g, ' ').trim().toLowerCase()
      .replace(/[^a-z0-9 %$.,+/()-]/g, '');
    const re = /t\(\s*'stem\.fireecology\.([A-Za-z0-9_]+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g;
    const drifted = [];
    const seen = new Set();
    for (const m of source.matchAll(re)) {
      const key = m[1];
      if (seen.has(key) || RICHER.has(key) || !(key in bank)) continue;
      seen.add(key);
      const fallback = m[2]
        .replace(/\\'/g, "'").replace(/\\"/g, '"')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      if (norm(bank[key]) !== norm(fallback)) drifted.push(key);
    }
    expect(seen.size).toBeGreaterThan(300);
    expect(drifted).toEqual([]);
  });

  it('explains itself instead of hanging when no AI backend is present', () => {
    // The harness passes callGemini: null, which is what a host without AI passes. Asking
    // used to throw synchronously, before any promise existed, so the .catch never ran and
    // the button sat on "Thinking..." for good.
    const html = renderFireEcology({ tab: 'science' });
    expect(html).toContain('data-fe-no-ai');
    expect(html).toContain('The AI tutor is switched off in this session');
    expect(html).not.toContain('placeholder="Ask about fire ecology');

    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    // A synchronous throw or a non-promise return must still reach the catch.
    expect(source).toContain('new Promise(function (resolve) { resolve(callGemini(prompt)); })');
    expect(source).not.toContain('callGemini(prompt).then(');
  });

  it('awards every badge it advertises, and never from inside render', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
    const declared = [...source.matchAll(/\{ id: '([A-Za-z0-9]+)', icon: '[^']*', label: '/g)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(20);
    const unawarded = declared.filter((id) => !source.includes(`checkBadge('${id}')`));
    expect(unawarded).toEqual([]);
    expect(source).not.toContain("(function() { checkBadge('waterProtector'); return null; })()");
  });
});
