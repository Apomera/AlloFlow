import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderAstronomy(state) {
  return renderTool('astronomy', { astronomy: state });
}

beforeEach(() => {
  window.__alloAstronomyAiPending = null;
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
    expect(html).not.toContain('forged');
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