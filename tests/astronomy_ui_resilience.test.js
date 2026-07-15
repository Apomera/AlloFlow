import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderAstronomy(state) {
  return renderTool('astronomy', { astronomy: state });
}

beforeEach(() => {
  window.__alloAstronomyAiPending = null;
  if (window.__alloAstronomyEclipseTimer) clearTimeout(window.__alloAstronomyEclipseTimer);
  window.__alloAstronomyEclipseTimer = null;
  if (window.__alloAstronomyMeteorTimer) clearTimeout(window.__alloAstronomyMeteorTimer);
  window.__alloAstronomyMeteorTimer = null;
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
});

describe('Astronomy UI state resilience', () => {
  it('recovers an invalid restored tab to Tonight with a complete tab-panel relationship', () => {
    const html = renderAstronomy({ tab: 'forged-section', observingList: [] });
    expect(html).toContain('id="astronomy-tab-tonight" role="tab" aria-selected="true" tabindex="0"');
    expect(html).toContain('aria-controls="astronomy-main" aria-label="Tonight"');
    expect(html).toContain('id="astronomy-main" role="tabpanel" aria-labelledby="astronomy-tab-tonight"');
    expect(html).toContain('Observation command · Tonight');
    expect(html).not.toContain('forged-section');
  });

  it('keeps one tab in the roving keyboard sequence', () => {
    const html = renderAstronomy({ tab: 'planets', observingList: [] });
    expect(html).toContain('id="astronomy-tab-planets" role="tab" aria-selected="true" tabindex="0"');
    expect(html).toContain('id="astronomy-tab-tonight" role="tab" aria-selected="false" tabindex="-1"');
    expect(html).toContain('id="astronomy-main" role="tabpanel" aria-labelledby="astronomy-tab-planets"');
  });

  it('normalizes a malformed observing list before rendering the printable kit', () => {
    expect(() => renderAstronomy({ tab: 'print', observingList: { forged: true } })).not.toThrow();
    const html = renderAstronomy({ tab: 'print', observingList: { forged: true } });
    expect(html).toContain('Observing kit');
    expect(html).toContain('Saved targets</div></div>');
  });

  it('does not accept forged or incomplete quiz completion state', () => {
    const html = renderAstronomy({
      tab: 'quiz', observingList: [],
      quizAnswers: { forged: true }, quizSubmitted: true, quizCorrect: 999
    });
    expect(html).toContain('Answer all questions to submit (0/');
    expect(html).not.toContain('999 /');
    expect(html).toContain('role="group" aria-labelledby="astronomy-quiz-q-0"');
    expect(html).toContain('aria-pressed="false" aria-describedby="astronomy-quiz-q-0"');
  });

  it('recomputes a submitted score from canonical answers', () => {
    const html = renderAstronomy({
      tab: 'quiz', observingList: [],
      quizAnswers: Array(15).fill(0), quizSubmitted: true, quizCorrect: 999
    });
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).not.toContain('999 /');
    expect(html).toMatch(/\d+ \/ 15/);
  });
});

describe('Astronomy keyboard navigation contract', () => {
  it('implements Arrow, Home, and End navigation through one validated activation path', () => {
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function activateAstronomyTab(tabId)');
    expect(source).toContain('function handleAstronomyTabKey(event)');
    expect(source).toContain("['ArrowLeft', 'ArrowRight', 'Home', 'End']");
    expect(source).toContain("event.currentTarget.querySelectorAll('[role=\"tab\"]')");
    expect(source).toContain("onClick: function() { activateAstronomyTab(t.id); }");
    expect(source).toContain("role: 'tabpanel', 'aria-labelledby': 'astronomy-tab-' + activeTab");
  });
});
describe('Astronomy Sky Map resilience', () => {
  it('recovers non-finite restored time offsets without leaking invalid diagram values', () => {
    const html = renderAstronomy({
      tab: 'skymap', observingList: [], skyLoc: { forged: true },
      skyHourOffset: Number.NaN, skyDayOffset: Number.POSITIVE_INFINITY
    });
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Invalid Date');
    expect(html).toContain('aria-label="Hours from now" aria-valuetext="Now"');
    expect(html).toMatch(/aria-label="Days from now"[^>]*>\+0d<\/span>/);
    expect(html).toContain('aria-label="Portland, Maine" aria-pressed="true"');
  });

  it('clamps restored time travel to the supported one-year window', () => {
    const html = renderAstronomy({
      tab: 'skymap', observingList: [], skyLoc: 'portland',
      skyHourOffset: 999, skyDayOffset: 9999
    });
    expect(html).toContain('aria-valuetext="+12 hours from now"');
    expect(html).toMatch(/aria-label="Days from now"[^>]*>\+365d<\/span>/);
    expect(html).toMatch(/aria-label="day ▶"[^>]*disabled/);
  });

  it('links the sky diagram to a visible orientation and altitude guide', () => {
    const html = renderAstronomy({ tab: 'skymap', observingList: [], skyLoc: 'portland' });
    expect(html).toContain('aria-describedby="astronomy-sky-map-help"');
    expect(html).toContain('id="astronomy-sky-map-help"');
    expect(html).toContain('North is at the top and east is on the left.');
    expect(html).toContain('inner rings mark 30° and 60° altitude');
    expect(html).toContain('Overhead chart: north at top, east at left');
  });

  it('uses pressed state only for location and Now toggles', () => {
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function boundedSkyOffset(value, min, max, step)');
    expect(source).toContain("'aria-pressed': isToggle ? on : undefined");
    expect(source).toContain("role: 'group', 'aria-label': 'Sky time controls'");
    expect(source).toContain("dayOff >= 365");
    expect(source).toContain('Math.min(1, Math.max(0.4, 1 - s.mag * 0.18))');
  });
});
describe('Astronomy observing-plan workflow', () => {
  it('exposes constellation selection and saved state as separate pressed controls', () => {
    const html = renderAstronomy({
      tab: 'constellations', selectedConstellation: 'ursa_major',
      observingList: ['ursa_major']
    });
    expect(html).toMatch(/aria-label="Ursa Major, The Great Bear \(Big Dipper\)"[^>]*aria-pressed="true"[^>]*aria-controls="astronomy-constellation-detail"/);
    expect(html).toContain('id="astronomy-constellation-detail" role="region" aria-live="polite" aria-label="Ursa Major details"');
    expect(html).toContain('aria-label="Remove Ursa Major from observing list" aria-pressed="true"');
    expect(html).toContain('✓ Saved · Remove');
  });

  it('offers a clear save action for an unsaved selected target', () => {
    const html = renderAstronomy({
      tab: 'constellations', selectedConstellation: 'orion', observingList: []
    });
    expect(html).toContain('aria-label="Add Orion to observing list" aria-pressed="false"');
    expect(html).toContain('☆ Save to observing list');
  });

  it('deduplicates the observing plan and provides accessible workflow actions', () => {
    const html = renderAstronomy({
      tab: 'observe', observingList: ['ursa_major', 'ursa_major', 'forged_target']
    });
    expect(html).toContain('1 target saved. Use the printable kit when you are ready to observe.');
    expect(html).toContain('aria-label="Remove Ursa Major from observing list"');
    expect(html).toContain('Open printable kit');
    expect(html).toContain('Add another target');
  });

  it('explains an empty printable kit instead of silently omitting the target section', () => {
    const html = renderAstronomy({ tab: 'print', observingList: [] });
    expect(html).toContain('No observing targets saved yet.');
    expect(html).toContain('Open the Constellations section');
  });

  it('recovers malformed Bortle state and exposes the active class', () => {
    const html = renderAstronomy({ tab: 'observe', observingList: [], bortleClass: 'forged' });
    expect(html).toContain('aria-label="Bortle class 5: Suburban sky" aria-pressed="true"');
    expect(html).toContain('Bortle 5: Suburban sky');
  });

  it('centralizes observing-list updates and validates Bortle state', () => {
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function setObservingTarget(constellationId, shouldSave)');
    expect(source).toContain('if (alreadySaved === shouldSave) return;');
    expect(source).toContain('restoredBortleClass >= 1 && restoredBortleClass <= 9');
    expect(source).not.toContain("addToast('Already on your observing list'");
  });
});
describe('Astronomy AI question resilience', () => {
  it('normalizes malformed restored input and response values', () => {
    expect(() => renderAstronomy({
      tab: 'tonight', observingList: [], askInput: { forged: true },
      askResponse: { forged: true }, askLoading: 'true'
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'tonight', observingList: [], askInput: { forged: true },
      askResponse: { forged: true }, askLoading: 'true'
    });
    expect(html).toContain('maxLength="500" aria-label="Question for the sky guide"');
    expect(html).toContain('500 characters maximum. Press Ctrl+Enter or Command+Enter to ask.');
    expect(html).not.toContain('[object Object]');
  });

  it('recovers a request that was interrupted before state was restored', () => {
    const html = renderAstronomy({
      tab: 'tonight', observingList: [], askInput: 'Where is Jupiter?', askLoading: true
    });
    expect(html).toContain('The previous AI request was interrupted. You can ask again.');
    expect(html).toContain('aria-label="Ask the sky guide"');
    expect(html).not.toContain('Thinking');
  });

  it('announces an available answer and provides a clear action', () => {
    const html = renderAstronomy({
      tab: 'tonight', observingList: [], askResponse: 'Look east shortly after sunset.'
    });
    expect(html).toContain('role="region" aria-label="Sky guide answer"');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('Clear answer');
    expect(html).toContain('Look east shortly after sunset.');
  });

  it('guards async responses with a request token and supports keyboard submission', () => {
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function sendAstronomyQuestion(questionText)');
    expect(source).toContain('window.__alloAstronomyAiPending !== requestToken');
    expect(source).toContain("typeof response === 'string' && response.trim()");
    expect(source).toContain("(e.ctrlKey || e.metaKey) && e.key === 'Enter'");
    expect(source).toContain('Promise.resolve().then(function()');
  });
});
describe('Astronomy diagram state resilience', () => {
  it('recovers a malformed Moon phase without crashing the diagram', () => {
    expect(() => renderAstronomy({ tab: 'moon', observingList: [], moonPhaseIdx: { forged: true } })).not.toThrow();
    const html = renderAstronomy({ tab: 'moon', observingList: [], moonPhaseIdx: { forged: true } });
    expect(html).toContain('aria-valuetext="New Moon, 0% illuminated" aria-describedby="astronomy-moon-phase-status"');
    expect(html).toContain('id="astronomy-moon-phase-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });

  it('describes the full Moon diagram without calling it waning', () => {
    const html = renderAstronomy({ tab: 'moon', observingList: [], moonPhaseIdx: 4 });
    expect(html).toContain('Moon disc showing 100% illumination. The entire visible face is illuminated.');
    expect(html).not.toContain('left, waning side');
  });

  it('recovers an invalid season month and keeps orbit geometry finite', () => {
    const html = renderAstronomy({ tab: 'seasons', observingList: [], seasonMonth: Number.POSITIVE_INFINITY });
    expect(html).toContain('aria-valuetext="June" aria-describedby="astronomy-season-status"');
    expect(html).toContain('Month: June. Northern Hemisphere: Summer. Southern Hemisphere: Winter.');
    expect(html).toContain('orbital position in June');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });

  it('normalizes malformed H-R lab controls, writing, and log state', () => {
    expect(() => renderAstronomy({
      tab: 'hrDiagram', observingList: [],
      hrHunt: { mass: 'forged', tempK: Number.POSITIVE_INFINITY, lumin: {}, hypothesis: {}, explanation: {}, log: {} }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'hrDiagram', observingList: [],
      hrHunt: { mass: 'forged', tempK: Number.POSITIVE_INFINITY, lumin: {}, hypothesis: {}, explanation: {}, log: {} }
    });
    expect(html).toContain('aria-valuetext="1 solar masses"');
    expect(html).toContain('aria-valuetext="5800 kelvin"');
    expect(html).toContain('aria-valuetext="1 solar luminosities"');
    expect(html).toContain('No observations logged yet');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('Infinity');
  });

  it('filters forged observations and labels valid H-R records clearly', () => {
    const html = renderAstronomy({
      tab: 'hrDiagram', observingList: [],
      hrHunt: { log: [
        { m: 'bad', t: 5800, l: 1, c: 'sunLike' },
        { m: 2, t: 7000, l: 20, c: 'forged' },
        { m: 1, t: 5800, l: 1, c: 'sunLike' }
      ] }
    });
    expect(html).toContain('1 logged');
    expect(html).toContain('aria-label="Logged H-R diagram observations"');
    expect(html).toContain('Recent star observations, newest at the bottom');
    expect(html).toContain('Sun-like');
  });

  it('connects H-R controls, prompt disclosure, and bounded writing fields', () => {
    const html = renderAstronomy({
      tab: 'hrDiagram', observingList: [],
      hrHunt: { stuckRevealed: true, understood: true, hypothesis: 'Compare stars', explanation: 'My explanation', log: [] }
    });
    expect(html).toContain('id="astronomy-hr-classification" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('aria-expanded="true" aria-controls="astronomy-hr-prompts"');
    expect(html).toContain('id="astronomy-hr-prompts" role="region" aria-label="H-R diagram investigation prompts"');
    expect(html).toContain('aria-label="H-R diagram hypothesis" maxLength="1000"');
    expect(html).toContain('aria-label="Explain your H-R diagram understanding" maxLength="1500"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function normalizeHrHunt(candidate)');
    expect(source).toContain('Number.isInteger(restoredMoonPhaseIdx)');
    expect(source).toContain('Number.isInteger(restoredSeasonMonth)');
  });
});
describe('Astronomy eclipse simulator resilience', () => {
  it('recovers malformed phase and mode state without invalid SVG geometry', () => {
    expect(() => renderAstronomy({
      tab: 'eclipses', observingList: [], eclipsePhase: { forged: true },
      eclipseType: { forged: true }, eclipseGeometry: 'forged', eclipsePlaying: 'true'
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'eclipses', observingList: [], eclipsePhase: { forged: true },
      eclipseType: { forged: true }, eclipseGeometry: 'forged', eclipsePlaying: 'true'
    });
    expect(html).toContain('role="group" aria-label="Eclipse type"');
    expect(html).toContain('Solar eclipse diagram. Total solar eclipse: 100% coverage at maximum alignment.');
    expect(html).toContain('aria-valuetext="50%, maximum alignment" aria-describedby="astronomy-eclipse-status"');
    expect(html).toContain('aria-label="Play animation" aria-pressed="false"');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('[object Object]');
  });

  it('draws a partial solar eclipse as an off-center crossing', () => {
    const html = renderAstronomy({
      tab: 'eclipses', observingList: [], eclipseType: 'solar', eclipseGeometry: 'partial', eclipsePhase: 50
    });
    expect(html).toContain('role="group" aria-label="Solar eclipse geometry"');
    expect(html).toContain('Partial solar eclipse: 58% coverage at maximum alignment.');
    expect(html).toContain('Solar eclipse diagram. Partial solar eclipse: 58% coverage at maximum alignment.');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain("var moonYOffset = geometryType === 'partial' ? 70 : 0");
    expect(source).toContain('Math.sqrt(moonOffset * moonOffset + moonYOffset * moonYOffset)');
  });

  it('announces a total lunar eclipse at maximum alignment', () => {
    const html = renderAstronomy({
      tab: 'eclipses', observingList: [], eclipseType: 'lunar', eclipsePhase: 50
    });
    expect(html).toContain('Lunar eclipse diagram. Phase 50%.');
    expect(html).toContain('fully inside Earth&#x27;s umbra: total lunar eclipse.');
    expect(html).toContain('id="astronomy-eclipse-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('TOTAL ECLIPSE');
  });

  it('distinguishes partial and penumbral lunar contacts', () => {
    const partial = renderAstronomy({
      tab: 'eclipses', observingList: [], eclipseType: 'lunar', eclipsePhase: 40
    });
    const penumbral = renderAstronomy({
      tab: 'eclipses', observingList: [], eclipseType: 'lunar', eclipsePhase: 30
    });
    expect(partial).toContain('overlaps Earth&#x27;s umbra: partial lunar eclipse.');
    expect(partial).toContain('PARTIAL ECLIPSE');
    expect(penumbral).toContain('overlaps Earth&#x27;s penumbra: penumbral lunar eclipse.');
    expect(penumbral).toContain('PENUMBRAL');
  });

  it('provides lifecycle-safe animation and maximum-alignment controls', () => {
    const html = renderAstronomy({ tab: 'eclipses', observingList: [], eclipsePhase: 12 });
    expect(html).toContain('aria-label="Show maximum eclipse alignment"');
    expect(html).toContain('id="astr-eclipse-phase" type="range"');
    expect(html).toContain('aria-valuetext="12%, approaching maximum alignment"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('var playing = d.eclipsePlaying === true;');
    expect(source).toContain('window.__alloAstronomyEclipseTimer = setTimeout');
    expect(source).toContain('clearTimeout(window.__alloAstronomyEclipseTimer)');
    expect(source).toContain("'aria-valuetext': opts.valueText || undefined");
  });
});
describe('Astronomy meteor simulator resilience', () => {
  it('recovers malformed shower and simulator state to a coherent Perseids view', () => {
    expect(() => renderAstronomy({
      tab: 'eclipses', observingList: [], selectedShower: 'invalid-shower',
      simZhr: { forged: true }, simBortleSim: Number.NaN,
      simRadiantAlt: Number.POSITIVE_INFINITY, simMeteorFrame: {}, simMeteorPlaying: 'true'
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'eclipses', observingList: [], selectedShower: 'invalid-shower',
      simZhr: { forged: true }, simBortleSim: Number.NaN,
      simRadiantAlt: Number.POSITIVE_INFINITY, simMeteorFrame: {}, simMeteorPlaying: 'true'
    });
    expect(html).toContain('role="group" aria-label="Meteor showers"');
    expect(html).toContain('aria-label="Perseids shower summary"');
    expect(html).toContain('aria-valuetext="100 /hr" aria-describedby="astronomy-meteor-rate-status"');
    expect(html).toContain('aria-valuetext="Bortle 4" aria-describedby="astronomy-meteor-rate-status"');
    expect(html).toContain('aria-valuetext="60°" aria-describedby="astronomy-meteor-rate-status"');
    expect(html).toContain('39 /hr');
    expect(html).toContain('aria-label="Play meteor simulation" aria-pressed="false"');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('[object Object]');
  });

  it('clamps extreme controls and wraps restored animation frames', () => {
    const html = renderAstronomy({
      tab: 'eclipses', observingList: [], selectedShower: 'geminids',
      simZhr: 999, simBortleSim: -20, simRadiantAlt: 999, simMeteorFrame: 1001.9
    });
    expect(html).toContain('aria-valuetext="300 /hr"');
    expect(html).toContain('aria-valuetext="Bortle 1"');
    expect(html).toContain('aria-valuetext="90°"');
    expect(html).toContain('frame 1');
    expect(html).toContain('estimated rate of 380 per hour under Bortle 1 skies');
  });

  it('moves the radiant above a fixed horizon as altitude increases', () => {
    const low = renderAstronomy({
      tab: 'eclipses', observingList: [], selectedShower: 'perseids', simRadiantAlt: 5
    });
    const high = renderAstronomy({
      tab: 'eclipses', observingList: [], selectedShower: 'perseids', simRadiantAlt: 90
    });
    expect(low).toContain('cx="300" cy="334.44444444444446" r="18"');
    expect(high).toContain('cx="300" cy="70" r="18"');
    expect(high).toContain('<line x1="0" y1="350" x2="600" y2="350"');
    expect(high).toContain('clip-path="url(#meteor-sky-clip)"');
  });

  it('allows a realistic zero-streak sample under poor observing conditions', () => {
    const html = renderAstronomy({
      tab: 'eclipses', observingList: [], selectedShower: 'ursids',
      simZhr: 5, simBortleSim: 9, simRadiantAlt: 5
    });
    expect(html).toContain('Illustrative 10-minute sample shows 0 meteors');
    expect(html).toContain('0 /hr');
    expect(html).toContain('Each frame is an illustrative 10-minute sample');
  });

  it('provides lifecycle-safe playback, bounded stepping, and reset controls', () => {
    const html = renderAstronomy({ tab: 'eclipses', observingList: [] });
    expect(html).toContain('aria-label="Reset meteor simulation conditions"');
    expect(html).toContain('aria-label="Advance one frame"');
    expect(html).toContain('id="astronomy-meteor-rate-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('aria-describedby="astronomy-meteor-rate-status astronomy-meteor-diagram-help"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('var animPlaying = d.simMeteorPlaying === true;');
    expect(source).toContain('window.__alloAstronomyMeteorTimer = setTimeout');
    expect(source).toContain('clearTimeout(window.__alloAstronomyMeteorTimer)');
    expect(source).toContain('(animFrame + 1) % 1000');
    expect(source).toContain('var radiantY = horizonY - (simAlt / 90 * 280);');
  });
});
describe('Astronomy star catalog resilience', () => {
  it('recovers malformed restored filters and shows the complete catalog', () => {
    expect(() => renderAstronomy({
      tab: 'stars', observingList: [], starsSearch: { forged: true },
      starsConstellation: { forged: true }, starsMaxDist: Number.POSITIVE_INFINITY
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'stars', observingList: [], starsSearch: { forged: true },
      starsConstellation: { forged: true }, starsMaxDist: Number.POSITIVE_INFINITY
    });
    expect(html).toContain('aria-valuetext="10000 ly (all)" aria-describedby="astronomy-star-result-count"');
    expect(html).toContain('id="astronomy-star-results" role="region" aria-label="Star catalog results"');
    expect(html).toContain('Eta Carinae');
    expect(html).toMatch(/Showing \d+ of \d+ stars/);
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('NaN');
  });

  it('searches constellation and spectral-class metadata safely', () => {
    const constellation = renderAstronomy({
      tab: 'stars', observingList: [], starsSearch: 'Orion', starsMaxDist: 10000
    });
    const spectral = renderAstronomy({
      tab: 'stars', observingList: [], starsSearch: 'G2V+K1V', starsMaxDist: 10000
    });
    expect(constellation).toContain('Betelgeuse');
    expect(constellation).toContain('Rigel');
    expect(spectral).toContain('Alpha Centauri');
    expect(spectral).toMatch(/Showing 1 of \d+ stars/);
  });

  it('does not call a 5,000-light-year subset the complete catalog', () => {
    const subset = renderAstronomy({ tab: 'stars', observingList: [], starsMaxDist: 5000 });
    const complete = renderAstronomy({ tab: 'stars', observingList: [], starsMaxDist: 10000 });
    expect(subset).toContain('aria-valuetext="5000 ly"');
    expect(subset).not.toContain('aria-valuetext="5000 ly (all)"');
    expect(subset).not.toContain('Eta Carinae');
    expect(complete).toContain('Eta Carinae');
  });

  it('provides an actionable empty state and clear-filter workflow', () => {
    const html = renderAstronomy({
      tab: 'stars', observingList: [], starsSearch: 'no-such-star-zzzz',
      starsConstellation: 'Orion', starsMaxDist: 5
    });
    expect(html).toContain('No stars match these filters.');
    expect(html).toContain('Try a broader search, another constellation, or a larger distance.');
    expect(html).toContain('Show all stars');
    expect(html).toContain('Clear filters');
    expect(html).toContain('Showing 0 of ');
  });

  it('exposes bounded search and semantic result-list relationships', () => {
    const html = renderAstronomy({ tab: 'stars', observingList: [], starsSearch: 'Sirius' });
    expect(html).toContain('maxLength="100" autoComplete="off" aria-label="Search stars" aria-controls="astronomy-star-results"');
    expect(html).toContain('role="list"');
    expect(html).toContain('role="listitem" aria-labelledby="astronomy-star-result-0"');
    expect(html).toContain('id="astronomy-star-result-count" role="status" aria-live="polite" aria-atomic="true"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain("if (e.key === 'Escape' && search)");
    expect(source).toContain('function clearStarFilters()');
    expect(source).toContain("[s.name, s.desig, s.con, s.spec, s.notes].join(' ')");
  });
});
describe('Astronomy gravitational lens resilience', () => {
  it('recovers malformed restored state without invalid SVG geometry', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], lensMass: { forged: true },
      lensOffset: Number.POSITIVE_INFINITY
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], lensMass: { forged: true },
      lensOffset: Number.POSITIVE_INFINITY
    });
    expect(html).toContain('id="astronomy-lens-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('Lens mass 50 times 10 to the 14th solar masses; source offset 0. Perfect alignment produces a complete Einstein ring.');
    expect(html).toContain('aria-valuetext="50 times 10^14 solar masses"');
    expect(html).toContain('aria-valuetext="0, perfect alignment"');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toMatch(/<circle[^>]+r="-/);
  });

  it('clamps and snaps mass and alignment controls to supported values', () => {
    const extremes = renderAstronomy({
      tab: 'galaxies', observingList: [], lensMass: 999, lensOffset: -999
    });
    const snapped = renderAstronomy({
      tab: 'galaxies', observingList: [], lensMass: 52, lensOffset: 11
    });
    expect(extremes).toContain('aria-valuetext="200 times 10^14 solar masses"');
    expect(extremes).toContain('aria-valuetext="80, source left of lens"');
    expect(snapped).toContain('aria-valuetext="50 times 10^14 solar masses"');
    expect(snapped).toContain('aria-valuetext="12, source right of lens"');
  });

  it('narrates ring, arc, and separated-image alignment states', () => {
    const ring = renderAstronomy({ tab: 'galaxies', observingList: [], lensOffset: 0 });
    const arcs = renderAstronomy({ tab: 'galaxies', observingList: [], lensOffset: 10 });
    const images = renderAstronomy({ tab: 'galaxies', observingList: [], lensOffset: 40 });
    expect(ring).toContain('Perfect alignment produces a complete Einstein ring.');
    expect(ring).toContain('Einstein ring');
    expect(arcs).toContain('Near alignment produces two distorted arcs.');
    expect(arcs).toContain('Lensed arcs');
    expect(images).toContain('Wide misalignment produces two separated images.');
    expect(images).toContain('Image 1');
    expect(images).toContain('Image 2');
  });

  it('keeps the maximum-mass schematic bounded inside the viewBox', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], lensMass: 200, lensOffset: 0
    });
    expect(html).toContain('viewBox="0 0 600 220"');
    expect(html).toContain('cx="300" cy="110" r="75"');
    expect(html).toContain('cx="300" cy="110" r="92"');
    expect(html).not.toMatch(/<circle[^>]+r="-/);
  });

  it('provides semantic controls, diagram relationships, and recovery actions', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('role="group" aria-label="Gravitational lens controls"');
    expect(html).toContain('id="astronomy-lens-diagram"');
    expect(html).toContain('aria-describedby="astronomy-lens-status astronomy-lens-help"');
    expect(html).toContain('aria-label="Show perfect gravitational lens alignment"');
    expect(html).toContain('aria-label="Reset gravitational lens simulation"');
    expect(html).toContain('Schematic, not to scale.');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function normalizedLensValue(value, min, max, step, fallback)');
    expect(source).toContain('var ringR = 30 + massRatio * 45;');
    expect(source).toContain('[1, 2, 3].map(function(level)');
  });
});
describe('Astronomy dark-matter explorer resilience', () => {
  it('recovers malformed restored topics to a visibly selected rotation-curves tab', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], selectedDM: { forged: true }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedDM: { forged: true }
    });
    expect(html).toContain('id="astronomy-dm-tab-rotation"');
    expect(html).toContain('aria-selected="true" aria-controls="astronomy-dm-panel" tabindex="0"');
    expect(html).toContain('id="astronomy-dm-panel" role="tabpanel" aria-labelledby="astronomy-dm-tab-rotation"');
    expect(html).toContain('Galaxy rotation curves');
    expect(html).not.toContain('[object Object]');
  });

  it('keeps the selected topic, tab, and panel relationship coherent', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedDM: 'darkenergy'
    });
    expect(html).toContain('id="astronomy-dm-tab-darkenergy"');
    expect(html).toContain('id="astronomy-dm-panel" role="tabpanel" aria-labelledby="astronomy-dm-tab-darkenergy"');
    expect(html).toContain('Dark energy + accelerating expansion');
    expect(html).toContain('role="tablist" aria-label="Dark matter and dark energy topics"');
  });

  it('adds an accessible cosmic-energy-budget diagram and readable legend', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('id="astronomy-energy-budget" role="img"');
    expect(html).toContain('aria-label="Cosmic energy budget: 5 percent ordinary matter, 27 percent dark matter, and 68 percent dark energy."');
    expect(html).toContain('<strong>5%</strong> ordinary matter');
    expect(html).toContain('<strong>27%</strong> dark matter');
    expect(html).toContain('<strong>68%</strong> dark energy');
  });

  it('supports roving focus and arrow, Home, and End keyboard navigation', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('type="button" role="tab"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-live="polite" aria-atomic="true"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain("if (e.key === 'ArrowRight' || e.key === 'ArrowDown')");
    expect(source).toContain("else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')");
    expect(source).toContain("else if (e.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (e.key === 'End') nextIndex = DM_TOPICS.length - 1;");
    expect(source).toContain("document.getElementById('astronomy-dm-tab-' + nextTopic.id)");
  });
});
describe('Astronomy cosmic-inflation explorer resilience', () => {
  it('recovers malformed restored topics to a coherent selected tab and panel', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], selectedInf: { forged: true }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedInf: { forged: true }
    });
    expect(html).toContain('id="astronomy-inf-tab-whyneed"');
    expect(html).toContain('aria-selected="true" aria-controls="astronomy-inf-panel" tabindex="0"');
    expect(html).toContain('id="astronomy-inf-panel" role="tabpanel" aria-labelledby="astronomy-inf-tab-whyneed"');
    expect(html).toContain('Why we needed inflation');
    expect(html).not.toContain('[object Object]');
  });

  it('keeps valid topic selection and panel labelling synchronized', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedInf: 'evidence'
    });
    expect(html).toContain('id="astronomy-inf-tab-evidence"');
    expect(html).toContain('id="astronomy-inf-panel" role="tabpanel" aria-labelledby="astronomy-inf-tab-evidence"');
    expect(html).toContain('Evidence for inflation');
    expect(html).toContain('role="tablist" aria-label="Cosmic inflation topics"');
  });

  it('renders a responsive, narrated inflation schematic without invalid geometry', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('id="astronomy-inflation-diagram" viewBox="0 0 600 180" role="img"');
    expect(html).toContain('aria-labelledby="astronomy-inflation-title astronomy-inflation-desc"');
    expect(html).toContain('A tiny causally connected patch expands exponentially');
    expect(html).toContain('Conceptual diagram');
    expect(html).not.toMatch(/<(?:circle|ellipse)[^>]+r[xy]?="-/);
  });

  it('supports roving focus and complete keyboard tab navigation', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('type="button" role="tab"');
    expect(html).toContain('tabindex="-1"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function onInfTopicKeyDown(e, index)');
    expect(source).toContain("if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index + 1;");
    expect(source).toContain("else if (e.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (e.key === 'End') nextIndex = INF_TOPICS.length - 1;");
    expect(source).toContain("document.getElementById('astronomy-inf-tab-' + nextTopic.id)");
  });
});
describe('Astronomy black-hole information explorer resilience', () => {
  it('recovers malformed restored topics to a coherent classical tab and panel', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], selectedBH: { forged: true }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedBH: { forged: true }
    });
    expect(html).toContain('id="astronomy-bh-tab-classical"');
    expect(html).toContain('aria-selected="true" aria-controls="astronomy-bh-panel" tabindex="0"');
    expect(html).toContain('id="astronomy-bh-panel" role="tabpanel" aria-labelledby="astronomy-bh-tab-classical"');
    expect(html).toContain('The classical black hole');
    expect(html).not.toContain('[object Object]');
  });

  it('keeps valid topic selection and panel labelling synchronized', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedBH: 'page'
    });
    expect(html).toContain('id="astronomy-bh-tab-page"');
    expect(html).toContain('id="astronomy-bh-panel" role="tabpanel" aria-labelledby="astronomy-bh-tab-page"');
    expect(html).toContain('Page curve + the recent breakthrough');
    expect(html).toContain('role="tablist" aria-label="Black-hole information topics"');
  });

  it('renders a responsive and narrated Page-curve comparison', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('id="astronomy-page-curve-diagram" viewBox="0 0 600 230" role="img"');
    expect(html).toContain('aria-labelledby="astronomy-page-curve-title astronomy-page-curve-desc"');
    expect(html).toContain('Hawking: keeps rising');
    expect(html).toContain('Unitary Page curve');
    expect(html).toContain('information recovered');
    expect(html).toContain('axes are not numerical or to scale');
  });

  it('supports roving focus and complete keyboard topic navigation', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('type="button" role="tab"');
    expect(html).toContain('tabindex="-1"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function onBHTopicKeyDown(e, index)');
    expect(source).toContain("if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index + 1;");
    expect(source).toContain("else if (e.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (e.key === 'End') nextIndex = BH_TOPICS.length - 1;");
    expect(source).toContain("document.getElementById('astronomy-bh-tab-' + nextTopic.id)");
  });
});
describe('Astronomy gravitational-wave explorer resilience', () => {
  it('recovers malformed restored topics to a coherent prediction tab and panel', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], selectedGW: { forged: true }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedGW: { forged: true }
    });
    expect(html).toContain('id="astronomy-gw-tab-predict"');
    expect(html).toContain('aria-selected="true" aria-controls="astronomy-gw-panel" tabindex="0"');
    expect(html).toContain('id="astronomy-gw-panel" role="tabpanel" aria-labelledby="astronomy-gw-tab-predict"');
    expect(html).toContain('Einstein&#x27;s prediction');
    expect(html).not.toContain('[object Object]');
  });

  it('keeps valid topic selection and panel labelling synchronized', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedGW: 'ligo'
    });
    expect(html).toContain('id="astronomy-gw-tab-ligo"');
    expect(html).toContain('id="astronomy-gw-panel" role="tabpanel" aria-labelledby="astronomy-gw-tab-ligo"');
    expect(html).toContain('LIGO + the 2015 detection');
    expect(html).toContain('role="tablist" aria-label="Gravitational-wave astronomy topics"');
  });

  it('renders a responsive and narrated interferometer schematic', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('id="astronomy-interferometer-diagram" viewBox="0 0 600 270" role="img"');
    expect(html).toContain('aria-labelledby="astronomy-interferometer-title astronomy-interferometer-desc"');
    expect(html).toContain('A laser reaches a beam splitter and travels along two perpendicular arms');
    expect(html).toContain('relative arm-length change');
    expect(html).toContain('arm lengths and strain are not to scale');
  });

  it('supports roving focus and complete keyboard topic navigation', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('type="button" role="tab"');
    expect(html).toContain('tabindex="-1"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function onGWTopicKeyDown(e, index)');
    expect(source).toContain("if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index + 1;");
    expect(source).toContain("else if (e.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (e.key === 'End') nextIndex = GW_TOPICS.length - 1;");
    expect(source).toContain("document.getElementById('astronomy-gw-tab-' + nextTopic.id)");
  });
});
describe('Astronomy pulsar explorer resilience', () => {
  it('recovers malformed restored topics to a coherent discovery tab and panel', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], selectedPSR: { forged: true }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedPSR: { forged: true }
    });
    expect(html).toContain('id="astronomy-psr-tab-discovery"');
    expect(html).toContain('aria-selected="true" aria-controls="astronomy-psr-panel" tabindex="0"');
    expect(html).toContain('id="astronomy-psr-panel" role="tabpanel" aria-labelledby="astronomy-psr-tab-discovery"');
    expect(html).toContain('Jocelyn Bell + LGM-1');
    expect(html).not.toContain('[object Object]');
  });

  it('keeps valid topic selection and panel labelling synchronized', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedPSR: 'magnetars'
    });
    expect(html).toContain('id="astronomy-psr-tab-magnetars"');
    expect(html).toContain('id="astronomy-psr-panel" role="tabpanel" aria-labelledby="astronomy-psr-tab-magnetars"');
    expect(html).toContain('Magnetars');
    expect(html).toContain('role="tablist" aria-label="Pulsar, magnetar, and fast radio burst topics"');
  });

  it('renders a responsive and narrated pulsar lighthouse schematic', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('id="astronomy-pulsar-diagram" viewBox="0 0 600 270" role="img"');
    expect(html).toContain('aria-labelledby="astronomy-pulsar-title astronomy-pulsar-desc"');
    expect(html).toContain('Its magnetic axis is tilted, producing two radiation beams');
    expect(html).toContain('rotation axis');
    expect(html).toContain('magnetic / beam axis');
    expect(html).toContain('angles, beam width, and sizes are not to scale');
  });

  it('supports roving focus and complete keyboard topic navigation', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('type="button" role="tab"');
    expect(html).toContain('tabindex="-1"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function onPSRTopicKeyDown(e, index)');
    expect(source).toContain("if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index + 1;");
    expect(source).toContain("else if (e.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (e.key === 'End') nextIndex = PSR_TOPICS.length - 1;");
    expect(source).toContain("document.getElementById('astronomy-psr-tab-' + nextTopic.id)");
  });
});
describe('Astronomy Cosmic Calendar resilience', () => {
  it('recovers malformed restored events to a coherent January 1 tab and panel', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], selectedCC: { forged: true }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedCC: { forged: true }
    });
    expect(html).toContain('id="astronomy-cc-tab-jan1"');
    expect(html).toContain('aria-selected="true" aria-controls="astronomy-cc-panel" tabindex="0"');
    expect(html).toContain('id="astronomy-cc-panel" role="tabpanel" aria-labelledby="astronomy-cc-tab-jan1"');
    expect(html).toContain('January 1, 12:00 AM');
    expect(html).not.toContain('[object Object]');
  });

  it('keeps valid event selection and panel labelling synchronized', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], selectedCC: 'agriculture'
    });
    expect(html).toContain('id="astronomy-cc-tab-agriculture"');
    expect(html).toContain('id="astronomy-cc-panel" role="tabpanel" aria-labelledby="astronomy-cc-tab-agriculture"');
    expect(html).toContain('December 31, 11:59:30 PM');
    expect(html).toContain('role="tablist" aria-label="Cosmic Calendar events"');
  });

  it('renders a responsive, narrated timeline with a final-minute zoom', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('id="astronomy-cosmic-calendar-diagram" viewBox="0 0 600 250" role="img"');
    expect(html).toContain('aria-labelledby="astronomy-cc-title astronomy-cc-desc"');
    expect(html).toContain('The lower timeline zooms into the final cosmic minute');
    expect(html).toContain('Zoom: final cosmic minute');
    expect(html).toContain('agriculture (~30 s before midnight)');
    expect(html).toContain('events in the final seconds overlap on a full-year timeline');
  });

  it('supports roving focus and complete keyboard event navigation', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('type="button" role="tab"');
    expect(html).toContain('tabindex="-1"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function onCCTopicKeyDown(e, index)');
    expect(source).toContain("if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index + 1;");
    expect(source).toContain("else if (e.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (e.key === 'End') nextIndex = CC_DATES.length - 1;");
    expect(source).toContain("document.getElementById('astronomy-cc-tab-' + nextTopic.id)");
  });
});
describe('Astronomy Messier catalog resilience', () => {
  it('recovers malformed restored filters without crashing or leaking values', () => {
    expect(() => renderAstronomy({
      tab: 'galaxies', observingList: [], messierType: { forged: true },
      messierSeason: Number.POSITIVE_INFINITY, messierSearch: { forged: true }
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], messierType: { forged: true },
      messierSeason: Number.POSITIVE_INFINITY, messierSearch: { forged: true }
    });
    expect(html).toContain('Showing 110 of 110 Messier objects');
    expect(html).toContain('id="astronomy-messier-results" role="list"');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('Infinity');
  });

  it('treats a Messier identifier as an exact match rather than a substring', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], messierSearch: 'M1'
    });
    expect(html).toContain('Showing 1 of 110 Messier objects');
    expect(html).toContain('Crab Nebula');
    expect(html).toContain('id="astronomy-messier-result-0"');
  });

  it('searches descriptive metadata and supports composite and other types', () => {
    const metadata = renderAstronomy({
      tab: 'galaxies', observingList: [], messierSearch: 'water-maser'
    });
    const emission = renderAstronomy({
      tab: 'galaxies', observingList: [], messierType: 'EN', messierSearch: 'Trifid'
    });
    const other = renderAstronomy({
      tab: 'galaxies', observingList: [], messierType: 'OTHER', messierSearch: 'Winnecke'
    });
    expect(metadata).toContain('Showing 1 of 110 Messier objects');
    expect(metadata).toContain('M106 Galaxy');
    expect(emission).toContain('Trifid Nebula');
    expect(other).toContain('Winnecke 4');
  });

  it('provides an actionable empty state and clear-filter workflow', () => {
    const html = renderAstronomy({
      tab: 'galaxies', observingList: [], messierType: 'SNR',
      messierSeason: 'Summer', messierSearch: 'no-such-object-zzzz'
    });
    expect(html).toContain('Showing 0 of 110 Messier objects');
    expect(html).toContain('No Messier objects match these filters.');
    expect(html).toContain('Try another identifier, object type, season, or keyword.');
    expect(html).toContain('Show all Messier objects');
    expect(html).toContain('aria-label="No Messier catalog results"');
  });

  it('exposes labelled filters and semantic result relationships', () => {
    const html = renderAstronomy({ tab: 'galaxies', observingList: [] });
    expect(html).toContain('role="search" aria-label="Filter Messier catalog"');
    expect(html).toContain('id="astronomy-messier-search" type="search"');
    expect(html).toContain('maxLength="100" autoComplete="off"');
    expect(html).toContain('aria-controls="astronomy-messier-results" aria-describedby="astronomy-messier-result-count"');
    expect(html).toContain('id="astronomy-messier-result-count" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('role="listitem" aria-labelledby="astronomy-messier-result-0"');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain("if (e.key === 'Escape' && search) upd({ messierSearch: '' });");
    expect(source).toContain("var identifierMatch = /^m\\s*0*(\\d{1,3})$/i.exec(search.trim());");
    expect(source).toContain("[o.name, 'M' + o.m, o.con, typeLabel(o.type), o.season, o.notes].join(' ')");
  });
});
describe('Astronomy telescope simulator resilience', () => {
  it('recovers malformed restored optics without invalid calculations or SVG', () => {
    expect(() => renderAstronomy({
      tab: 'observe', observingList: [], scopeType: { forged: true },
      scopeAperture: { forged: true }, scopeFocalLen: Number.POSITIVE_INFINITY,
      eyepieceFl: Number.NaN
    })).not.toThrow();
    const html = renderAstronomy({
      tab: 'observe', observingList: [], scopeType: { forged: true },
      scopeAperture: { forged: true }, scopeFocalLen: Number.POSITIVE_INFINITY,
      eyepieceFl: Number.NaN
    });
    expect(html).toContain('Refractor: 100 millimeter aperture, 1000 millimeter focal length, 25 millimeter eyepiece.');
    expect(html).toContain('40 times magnification, f/10.0, 2.5 millimeter exit pupil.');
    expect(html).toContain('aria-valuetext="100 millimeters"');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
    expect(html).not.toContain('[object Object]');
  });

  it('clamps and snaps restored optical controls to supported values', () => {
    const extremes = renderAstronomy({
      tab: 'observe', observingList: [], scopeAperture: 999,
      scopeFocalLen: -20, eyepieceFl: 0
    });
    const snapped = renderAstronomy({
      tab: 'observe', observingList: [], scopeAperture: 106,
      scopeFocalLen: 1024, eyepieceFl: 25.6
    });
    expect(extremes).toContain('aria-valuetext="400 millimeters"');
    expect(extremes).toContain('aria-valuetext="300 millimeters"');
    expect(extremes).toContain('aria-valuetext="4 millimeters"');
    expect(snapped).toContain('aria-valuetext="110 millimeters"');
    expect(snapped).toContain('aria-valuetext="1000 millimeters"');
    expect(snapped).toContain('aria-valuetext="26 millimeters"');
  });

  it('warns when magnification exceeds the approximate useful limit', () => {
    const html = renderAstronomy({
      tab: 'observe', observingList: [], scopeAperture: 50,
      scopeFocalLen: 3000, eyepieceFl: 4
    });
    expect(html).toContain('750 times magnification');
    expect(html).toContain('Magnification exceeds the approximate useful limit of 100 times.');
    expect(html).toContain('too small');
  });

  it('keeps telescope design tabs, panel labels, and diagrams synchronized', () => {
    const reflector = renderAstronomy({
      tab: 'observe', observingList: [], scopeType: 'reflector'
    });
    expect(reflector).toContain('role="tablist" aria-label="Telescope optical design"');
    expect(reflector).toContain('id="astronomy-scope-tab-reflector" type="button" role="tab" aria-selected="true"');
    expect(reflector).toContain('id="astronomy-scope-diagram-panel" role="tabpanel" aria-labelledby="astronomy-scope-tab-reflector"');
    expect(reflector).toContain('id="astronomy-scope-reflector-diagram" viewBox="0 0 600 220" role="img"');
    expect(reflector).toContain('Reflector: 100 millimeter aperture');
  });

  it('provides described controls, live results, performance grouping, and reset', () => {
    const html = renderAstronomy({ tab: 'observe', observingList: [] });
    expect(html).toContain('role="group" aria-label="Telescope optical controls"');
    expect(html).toContain('id="astronomy-scope-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('aria-describedby="astronomy-scope-status astronomy-scope-help"');
    expect(html).toContain('id="astronomy-scope-stats" role="group" aria-label="Calculated telescope performance"');
    expect(html).toContain('aria-label="Reset telescope simulator"');
    expect(html).toContain('dimensions are not drawn to scale');
    const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
    expect(source).toContain('function normalizedScopeValue(value, min, max, step, fallback)');
    expect(source).toContain("var type = d.scopeType === 'reflector' ? 'reflector' : 'refractor';");
    expect(source).toContain("document.getElementById('astronomy-scope-tab-' + nextType)");
  });
});