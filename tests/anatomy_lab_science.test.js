import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderAnatomy(state = {}) {
  return renderTool('anatomy', { anatomy: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_anatomy.js', 'anatomy');
});

describe('Anatomy Lab progression and quiz logic', () => {
  it('requires all 10 systems for the all-systems quest', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('countStoredTrueFlags(d._systemsExplored, ANATOMY_SYSTEM_IDS) >= ANATOMY_SYSTEM_IDS.length');
    expect(source).not.toContain('Object.keys(d._systemsExplored || {}).length');
  });

  it('excludes every valid system from System ID distractors', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("var validSys = sysKeys.filter(function(k)");
    expect(source).toContain("validSys.indexOf(k) === -1");
    expect(source).toContain("+ quizAnswerLabel");
  });
});

describe('Anatomy Lab homeostasis teaching model', () => {
  it('uses named reference ranges and clearly disclaims clinical interpretation', () => {
    const html = renderAnatomy({ _activeTab: 'homeoHunt' });
    expect(html).toContain('All within teaching references');
    expect(html).toContain('Fasting glucose (mg/dL)');
    expect(html).toContain('Teaching model only, not a clinical score or diagnosis');
    expect(html).toContain('role="status"');
  });

  it('reports how many variables are outside range without diagnosing severity', () => {
    const html = renderAnatomy({
      _activeTab: 'homeoHunt',
      homeoHunt: { tempC: 39, pH: 7.4, glucose: 130, log: [] }
    });
    expect(html).toContain('2 variables outside reference');
    expect(html).not.toContain('life-threatening');
  });
});

describe('Anatomy Lab clinical-case integrity', () => {
  it('filters cases to the selected system and tracks reveal state by case id', () => {
    const html = renderAnatomy({ system: 'circulatory', complexity: 3, _showClinical: true });
    expect(html).toContain('Racing Heart After Exercise');
    expect(html).not.toContain('The Runner\'s Knee');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("clinicalCaseIds.indexOf(d._activeCaseId) !== -1 ? d._activeCaseId : null");
    expect(source).toContain("activeCaseId === cs.id");
    expect(source).toContain('Review explanation');
  });
});

describe('Anatomy Lab accessibility', () => {
  it('supports the tab keyboard pattern and exposes its active panel', () => {
    const html = renderAnatomy({ _activeTab: 'explore' });
    expect(html).toContain('aria-label="Anatomy learning modes"');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('tabindex="0"');
  });

  it('keeps diagram keyboard navigation scoped to the canvas', () => {
    const html = renderAnatomy({ _activeTab: 'explore' });
    expect(html).toContain('data-anatomy-canvas-help="true"');
    expect(html).toContain('Select markers with pointer or arrow keys.');
    expect(html).toContain('R/L always indicates the patient');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("e.currentTarget.tagName !== 'CANVAS'");
    expect(source).not.toContain('onKeyDown: handleKeyNav,\n          \'data-anatomy-tool\'');
  });

  it('allows the automatically selected system layer to be hidden', () => {
    const html = renderAnatomy({
      _activeTab: 'explore',
      system: 'skeletal',
      visibleLayers: { skin: true, skeletal: false }
    });
    expect(html).toContain('aria-label="Show Skeletal layer"');
    expect(html).toContain('1 layer visible');
  });
});

describe('Anatomy Lab interaction performance', () => {
  it('updates hover state only when the hovered structure changes', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('if (e.currentTarget._anatomyHoverId === nextHoverId) return;');
    expect(source).not.toContain('_hoverX');
    expect(source).not.toContain('_hoverY');
  });

  it('wraps quiz diagram feedback and presents an unambiguous score', () => {
    const html = renderAnatomy({ system: 'skeletal', complexity: 3, quizMode: true, quizIdx: 25, quizScore: 7 });
    expect(html).toContain('Score 7 - Question 7/19');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('quizPool[quizRoundIdx % quizPool.length]');
    expect(source).toContain('_quizAttempts: quizAttempts + 1');
    expect(source).not.toContain("upd('_quizAttempts', (d._quizAttempts || 0) + 1)");
  });

  it('offers a recovery action when a search has no results', () => {
    const html = renderAnatomy({ system: 'skeletal', complexity: 3, search: 'not-a-real-structure' });
    expect(html).toContain('No structures match');
    expect(html).toContain('Clear search');
    expect(html).toContain('role="status"');
  });
});
describe('Anatomy Lab learning-flow semantics', () => {
  it('keeps exploration progress independent from search filtering', () => {
    const html = renderAnatomy({
      system: 'skeletal',
      complexity: 3,
      search: 'skull',
      _structuresViewed: { skull: true }
    });
    expect(html).toContain('1/19 explored');
    expect(html).toContain('2 matching');
    expect(html).not.toContain('1/1 explored');
  });

  it('exposes quiz feedback and progress as live accessible status', () => {
    const html = renderAnatomy({
      system: 'skeletal',
      complexity: 3,
      quizMode: true,
      quizIdx: 0,
      quizScore: 1,
      quizFeedback: { chosen: 'skull', correct: true }
    });
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('role="progressbar"');
  });

  it('labels detail and disclosure controls by their actual action', () => {
    const details = renderAnatomy({ system: 'skeletal', complexity: 3, selectedStructure: 'skull' });
    expect(details).toContain('aria-label="Back to structures from Skull (Cranium)"');
    expect(details).toContain('← Structures');
    expect(details).toContain('aria-label="Use Skull (Cranium) as comparison target"');

    const overview = renderAnatomy({ system: 'skeletal', complexity: 3 });
    expect(overview).toContain('aria-controls="anatomy-mnemonics-panel"');
    expect(overview).toContain('aria-controls="anatomy-clinical-cases"');
  });
});
describe('Anatomy Lab render scheduling', () => {
  it('gates progress side effects behind a progress fingerprint', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('window.__alloAnatomyProgressFingerprint !== progressFingerprint');
    expect(source).toContain('window.__alloAnatomyProgressFingerprint = progressFingerprint');
  });

  it('renders an immediate clear action for active searches', () => {
    const html = renderAnatomy({ system: 'skeletal', complexity: 3, search: 'heart' });
    expect(html).toContain('aria-label="Clear anatomy search"');
    expect(html).toContain('✕ Clear');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("if (e.key === 'Escape')");
    expect(source).toContain("updMulti({ search: '', selectedStructure: null })");
  });
});
describe('Anatomy Lab quiz balance and tracking', () => {
  it('alternates True/False claims across successive True/False rounds', () => {
    const firstRound = renderAnatomy({ system: 'skeletal', complexity: 3, quizMode: true, quizIdx: 1 });
    const secondRound = renderAnatomy({ system: 'skeletal', complexity: 3, quizMode: true, quizIdx: 5 });
    expect(firstRound).toContain('belongs to the Skeletal system.');
    expect(secondRound).not.toContain('belongs to the Skeletal system.');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('Math.floor(quizRoundIdx / quizTypeCount) % 2');
    expect(source).not.toContain("tfTrue = ((d.quizIdx || 0) % 2) === 0");
  });

  it('consolidates render-derived progress into one deferred update', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var progressTrackingPatch = {};');
    expect(source).toContain('updMulti(progressTrackingPatch);');
    expect(source).toContain('window.__alloAnatomyTrackingPending');
    expect(source).not.toContain("upd('_systemsExplored', newSE)");
    expect(source).not.toContain("upd('_viewsUsed', newVU)");
    expect(source).not.toContain("upd('_structuresViewed', newSV)");
  });
});
describe('Anatomy Lab saved-state recovery', () => {
  it('clamps stale tour and pathway positions to valid content', () => {
    const tour = renderAnatomy({ _activeTab: 'tour', _tourActive: true, _tourStepIdx: -5 });
    expect(tour).toContain('Step 1 of');
    expect(tour).not.toContain('Step 0 of');

    const invalidPathway = renderAnatomy({ _activeTab: 'pathways', _activePathway: 'missing-pathway', _pathwayStep: 999 });
    expect(invalidPathway).toContain('Path of Blood');

    const finalPathwayStep = renderAnatomy({ _activeTab: 'pathways', _activePathway: 'path_blood', _pathwayStep: 999 });
    expect(finalPathwayStep).toContain('Step 10 of 10');
  });

  it('wraps negative flashcard positions without rendering an invalid card', () => {
    expect(() => renderAnatomy({ _activeTab: 'flashcards', _flashcardIdx: -1 })).not.toThrow();
    const html = renderAnatomy({ _activeTab: 'flashcards', _flashcardIdx: -1 });
    expect(html).toContain('Anatomy Flashcards');
    expect(html).toContain('role="group" aria-label="Flashcard 23 of 23: Scaphoid Bone"');
  });

  it('resets quiz attempts atomically and clears ended Spotter rounds', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("updMulti({ quizMode: !quizMode, quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0 })");
    expect(source).toContain("_spotterOpts: [], _spotterStartTime: 0, _spotterElapsed: 0");
  });

  it('exposes guided, pathway, and Spotter updates to assistive technology', () => {
    const tour = renderAnatomy({ _activeTab: 'tour', _tourActive: true });
    expect(tour).toContain('aria-label="Guided tour progress"');

    const pathway = renderAnatomy({ _activeTab: 'pathways', _activePathway: 'path_blood' });
    expect(pathway).toContain('aria-label="Path of Blood pathway progress"');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("className: 'space-y-2', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
  });
});
describe('Anatomy Lab quiz transition integrity', () => {
  it('limits questions to structures visible in the selected orientation', () => {
    const html = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3, quizMode: true, quizIdx: 0 });
    expect(html).toContain('Question 1/19');
    expect(html).toContain('Questions match the anterior diagram.');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var quizPool = viewFiltered.filter(function(s) { return s.fn; });');
  });

  it('normalizes invalid restored quiz rounds to the first question', () => {
    const html = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3, quizMode: true, quizIdx: -7 });
    expect(html).toContain('Question 1/19');
    expect(html).not.toContain('Question 0/');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('rawQuizRoundIdx >= 0 ? Math.floor(rawQuizRoundIdx) : 0');
    expect(source).not.toContain('(d.quizIdx || 0)');
  });

  it('resets quiz feedback atomically across system, orientation, and level changes', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('return { system: systemId, selectedStructure: null, quizMode: false, quizIdx: 0, quizScore: 0, quizFeedback: null');
    expect(source).toContain('view: v, selectedStructure: null, quizIdx: 0, quizScore: 0, quizFeedback: null');
    expect(source).toContain('complexity: lv.v, selectedStructure: null, quizIdx: 0, quizScore: 0, quizFeedback: null');
  });

  it('labels related system, orientation, and level controls as groups', () => {
    const html = renderAnatomy({ system: 'skeletal', complexity: 3 });
    expect(html).toContain('role="group" aria-label="Body system"');
    expect(html).toContain('role="group" aria-label="Body orientation"');
    expect(html).toContain('role="group" aria-label="Learning level"');
  });
});
describe('Anatomy Lab navigation recovery', () => {
  it('falls back to a valid tab, system, orientation, and learning level', () => {
    const html = renderAnatomy({ _activeTab: 'missing-mode', system: 'missing-system', view: 'sideways', complexity: -4 });
    expect(html).toContain('Skeletal system');
    expect(html).toContain('Anterior \u00b7 2D atlas');
    expect(html).toContain('19 structures');
    expect(html).toContain('aria-label="Explore" role="tab" aria-controls="anatomy-mode-panel" aria-selected="true"');
    expect(html).toContain('id="anatomy-mode-panel"');
  });

  it('ignores a restored selection hidden by the current diagram view', () => {
    const html = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'scapula' });
    expect(html).not.toContain('Back to structures from Scapula');
    expect(html).toContain('data-anatomy-panel="explore"');
  });

  it('handles malformed search state and wraps negative fact positions', () => {
    expect(() => renderAnatomy({ search: { query: 'skull' } })).not.toThrow();
    const html = renderAnatomy({ _factIdx: -1 });
    expect(html).toContain('Did you know?');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('((Math.floor(rawFactIdx) % sysFacts.length) + sysFacts.length) % sysFacts.length');
  });

  it('uses one navigation helper and atomic guided-tour transitions', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("activateAnatomyTab('connections')");
    expect(source).toContain('var tourPatch = { _activeTab: tab, _tourActive: true, _tourStepIdx: nextTourIndex };');
    expect(source).toContain('updMulti(structureFocusPatch(tabTourStep.structureId, tourPatch));');
    expect(source).toContain("updMulti({ _tourCompleted: true, _tourActive: false, _activeTab: 'explore' })");
    expect(source).not.toContain("upd('_activeTab', 'tour'); if (!tourActive)");
  });
});
describe('Anatomy Lab assessment-state resilience', () => {
  it('offers recovery for incomplete restored Spotter rounds', () => {
    const html = renderAnatomy({
      _activeTab: 'spotter',
      _spotterActive: true,
      _spotterTarget: 'skull',
      _spotterOpts: { invalid: true },
      _spotterBestTime: 'not-a-time',
      _spotterElapsed: 'not-a-time'
    });
    expect(html).toContain('This saved Spotter round is incomplete.');
    expect(html).toContain('Start a fresh round');
    expect(html).toContain('role="alert"');
  });

  it('normalizes valid restored Spotter scores and timing values', () => {
    const html = renderAnatomy({
      _activeTab: 'spotter',
      _spotterActive: true,
      _spotterScore: '4',
      _spotterTotal: '2',
      _spotterTarget: 'skull',
      _spotterFeedback: 'skull',
      _spotterStartTime: 1,
      _spotterElapsed: '1.25',
      _spotterBestTime: '2.5',
      _spotterOpts: [{ id: 'skull' }, { id: 'ribs' }, { id: 'femur' }, { id: 'humerus' }]
    });
    expect(html).toContain('4/4');
    expect(html).toContain('Best: 2.5s');
    expect(html).toContain('Correct! (1.3s)');
  });

  it('consolidates each Spotter answer into one state update', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var spotterUpdate = { _spotterFeedback: opt.id, _spotterElapsed: elapsed, _spotterTotal: spotterTotal + 1 };');
    expect(source).toContain('updMulti(spotterUpdate);');
    expect(source).not.toContain("upd('_spotterElapsed', elapsed)");
  });

  it('merges partial Homeostasis saves with safe teaching defaults', () => {
    const html = renderAnatomy({
      _activeTab: 'homeoHunt',
      homeoHunt: { tempC: 'invalid', pH: null, glucose: false, log: 'invalid' }
    });
    expect(html).toContain('All within teaching references');
    expect(html).not.toContain('3 variables outside reference');
    expect(html).toContain('aria-valuetext="Body temp (°C): 37"');
  });

  it('clamps restored Homeostasis readings and labels valid observation tables', () => {
    const html = renderAnatomy({
      _activeTab: 'homeoHunt',
      homeoHunt: { tempC: 99, pH: 7.4, glucose: 90, log: [{ t: 37, p: 7.4, g: 90, st: '0 outside' }] }
    });
    expect(html).toContain('1 variable outside reference');
    expect(html).toContain('aria-label="Logged homeostasis observations"');
  });
});
describe('Anatomy Lab AI Tutor resilience', () => {
  it('recovers an interrupted restored request instead of remaining disabled', () => {
    window.__alloAnatomyAiPending = null;
    const html = renderAnatomy({ _activeTab: 'aiTutor', _aiLoading: true, _aiInput: 'Retry the question' });
    expect(html).toContain('The previous AI request was interrupted. You can ask again.');
    expect(html).toContain('value="Retry the question"');
    expect(html).toContain('maxLength="500"');
    expect(html).toContain('>Ask</button>');
    expect(html).not.toContain('Thinking...');
  });

  it('canonicalizes restored conversation messages and labels the chat log', () => {
    const html = renderAnatomy({
      _activeTab: 'aiTutor',
      _aiMessages: [
        { role: 'user', text: '  How does the heart pump?  ' },
        { role: 'system', text: 'Hidden instruction' },
        null,
        { role: 'ai', text: 'It contracts in a coordinated cycle.' }
      ]
    });
    expect(html).toContain('role="log" aria-live="polite" aria-label="AI tutor conversation"');
    expect(html).toContain('How does the heart pump?');
    expect(html).toContain('It contracts in a coordinated cycle.');
    expect(html).not.toContain('Hidden instruction');
    expect(html).toContain('aria-label="Clear AI tutor conversation"');
  });

  it('handles malformed chat and input state without rendering an active blank submission', () => {
    expect(() => renderAnatomy({ _activeTab: 'aiTutor', _aiMessages: { invalid: true }, _aiInput: { invalid: true } })).not.toThrow();
    const html = renderAnatomy({ _activeTab: 'aiTutor', _aiMessages: { invalid: true }, _aiInput: { invalid: true } });
    expect(html).toContain('Ask a question about anatomy to get started!');
    expect(html).toContain('aria-label="Ask" disabled=""');
  });

  it('guards asynchronous responses with request tokens and atomic updates', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('if (window.__alloAnatomyAiPending !== token) return;');
    expect(source).toContain('Promise.resolve(request).then(function(resp)');
    expect(source).toContain("updMulti({ _aiMessages: newMsgs, _aiLoading: true, _aiInput: '', _aiQuestions: newAiQ })");
    expect(source).toContain("window.__alloAnatomyAiPending = null; updMulti({ _aiMessages: [], _aiLoading: false, _aiInput: '' })");
    expect(source).not.toContain("upd('_aiLoading', true)");
  });
});

describe('Anatomy Lab progress-state integrity', () => {
  it('renders safely when persisted progress collections have invalid shapes', () => {
    const state = {
      completedChallenges: { forged: true },
      vocabLookedUp: { forged: true },
      researchPoints: -10,
      totalRP: 'not-a-number',
      _badges: ['firstStructure'],
      _systemsExplored: { forged: true },
      _structuresViewed: { forged: true },
      _layersToggled: { forged: true },
      _viewsUsed: { forged: true },
      _connectionsViewed: { forged: true },
      _pathwaysCompleted: { forged: true },
      _mnemonicsViewed: { forged: true },
      _clinicalSolvedIds: { forged: true },
      _clinicalSolved: 999
    };
    expect(() => renderAnatomy(state)).not.toThrow();
    const html = renderAnatomy(state);
    expect(html).toContain('0 RP - 0/6');
    expect(html).toContain('0/20 badges');
    expect(html).toContain('<strong>0/10</strong>');
  });

  it('deduplicates allow-listed progress and ignores forged catalog ids', () => {
    const html = renderAnatomy({
      completedChallenges: ['explore_systems', 'explore_systems', 'forged'],
      researchPoints: '15',
      _badges: { firstStructure: true, forged: true },
      _systemsExplored: { skeletal: true, forged: true },
      _structuresViewed: { skull: true, heart: true, forged: true }
    });
    expect(html).toContain('15 RP - 1/6');
    expect(html).toContain('1/20 badges');
    expect(html).toContain('<strong>1/10</strong>');
    expect(html).toContain('<strong>2</strong><span>Structures viewed</span>');
  });

  it('normalizes every restored achievement domain against its catalog', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('function safeFlagMap(value, allowedIds)');
    expect(source).toContain('safeFlagMap(d._badges, BADGE_DEFS.map');
    expect(source).toContain('safeFlagMap(d._systemsExplored, ANATOMY_SYSTEM_IDS)');
    expect(source).toContain('safeFlagMap(d._structuresViewed, knownStructureIds');
    expect(source).toContain('safeFlagMap(d._connectionsViewed, connectionIds)');
    expect(source).toContain('safeFlagMap(d._pathwaysCompleted, pathwayIds)');
    expect(source).toContain('safeFlagMap(d._mnemonicsViewed, mnemonicIds)');
    expect(source).toContain('Array.isArray(d.completedChallenges)');
    expect(source).toContain('Array.isArray(d.vocabLookedUp)');
  });

  it('applies connection and clinical-case interactions atomically', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var connectionPatch = { _expandedConn:');
    expect(source).toContain('updMulti(connectionPatch);');
    expect(source).toContain("_activeCaseFeedback: 'reveal',");
    expect(source).not.toContain("upd('_activeCaseFeedback', 'reveal')");
  });
});
describe('Anatomy Lab layer and quiz-state resilience', () => {
  it('preserves explicit hidden layers while discarding invalid layer entries', () => {
    const html = renderAnatomy({
      system: 'skeletal',
      visibleLayers: { skin: 'yes', skeletal: false, forged: true }
    });
    expect(html).toContain('aria-label="Show Skin layer"');
    expect(html).toContain('aria-label="Show Skeletal layer"');
    expect(html).toContain('0 layers visible');
  });

  it('recovers invalid layer and confetti collection shapes without crashing', () => {
    expect(() => renderAnatomy({ visibleLayers: ['skeletal'], _confettiParticles: { forged: true } })).not.toThrow();
    const html = renderAnatomy({ visibleLayers: ['skeletal'], _confettiParticles: { forged: true } });
    expect(html).toContain('aria-label="Hide Skin layer"');
    expect(html).toContain('aria-label="Hide Skeletal layer"');
  });

  it('does not activate quiz mode from truthy strings or lock answers with forged feedback', () => {
    const inactive = renderAnatomy({ quizMode: 'true', quizScore: 'bad', quizFeedback: { chosen: 'skull', correct: true } });
    expect(inactive).not.toContain('Anatomy Quiz');

    const active = renderAnatomy({ quizMode: true, quizScore: 'bad', quizFeedback: { chosen: 'forged', correct: true } });
    expect(active).toContain('Score 0 - Question 1/19');
    expect(active).not.toContain('aria-label="Next Question"');
  });

  it('recomputes restored quiz correctness from the current answer', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3, quizMode: true, quizIdx: 0,
      quizFeedback: { chosen: 'skull', correct: false }
    });
    expect(html).toContain('Correct!');
    expect(html).toContain('aria-label="Next Question"');
  });

  it('uses canonical counters and atomic patches for interactive rewards', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('function safeBooleanMap(value, allowedIds)');
    expect(source).toContain('countStoredTrueFlags(d.visibleLayers, ANATOMY_LAYER_IDS.slice(1))');
    expect(source).toContain('updMulti({ visibleLayers: newLayers, _layersToggled: newLayersToggled, _xrayMode: false })');
    expect(source).toContain('function applyAnatomySearchResult(result)');
    expect(source).toContain('var quizPatch = {');
    expect(source).toContain('_totalCorrect = totalCorrect + 1');
    expect(source).not.toContain('(d._searchFinds || 0) + 1');
    expect(source).not.toContain('(d.quizScore || 0) + 1');
  });
});
describe('Anatomy Lab guided diagram synchronization', () => {
  it('offers a live recovery action when a restored pathway and diagram disagree', () => {
    const html = renderAnatomy({
      _activeTab: 'pathways', system: 'skeletal', view: 'anterior',
      _activePathway: 'path_air', _pathwayStep: 0
    });
    expect(html).toContain('Diagram: Skeletal - Anterior');
    expect(html).toContain('Focus diagram');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
  });

  it('does not offer pathway recovery when the diagram already matches the step', () => {
    const html = renderAnatomy({
      _activeTab: 'pathways', system: 'circulatory', view: 'anterior',
      _activePathway: 'path_blood', _pathwayStep: 0, selectedStructure: 'sup_vena'
    });
    expect(html).toContain('Diagram: Circulatory - Anterior');
    expect(html).not.toContain('Focus diagram');
  });

  it('normalizes malformed search, selection, disclosures, and Spotter booleans', () => {
    const explore = renderAnatomy({
      search: { forged: true }, selectedStructure: { forged: true },
      _showMnemonics: 'true', _showClinical: 'true'
    });
    expect(explore).not.toContain('[object Object]');
    expect(explore).toContain('maxLength="200"');
    expect(explore).toContain('aria-expanded="false" aria-controls="anatomy-mnemonics-panel"');
    expect(explore).toContain('aria-expanded="false" aria-controls="anatomy-clinical-cases"');
    expect(explore).toContain('Show Cases');

    const spotter = renderAnatomy({ _activeTab: 'spotter', _spotterActive: 'true' });
    expect(spotter).toContain('Start Spotter Test');
  });

  it('uses the shared focus patch for tour, pathway, and flashcard transitions', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("'nervous', 'organs', 'respiratory'");
    expect(source).not.toContain("'nervous', 'digestive', 'respiratory'");
    expect(source).toContain('function findStructureContext(structureId, preferredSystemId)');
    expect(source).toContain('function structureFocusPatch(structureId, extraPatch)');
    expect(source).toContain("updMulti(structureFocusPatch(pw.steps[0].structure, { _activePathway: pw.id, _pathwayStep: 0 }))");
    expect(source).toContain("updMulti(structureFocusPatch(tourSteps[next].structureId, { _tourStepIdx: next }))");
    expect(source).toContain("updMulti(structureFocusPatch(flashcardPool[ni].id, { _flashcardIdx: ni, _flashcardFlipped: false }))");
    expect(source).not.toContain("upd('_pathwayStep', next); upd('selectedStructure'");
    expect(source).not.toContain("upd('_flashcardIdx', ni); upd('_flashcardFlipped'");
  });

  it('records comparison progress only through unique pair tracking', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("return [firstId, secondId].sort().join('::')");
    expect(source).toContain('patch._comparisonPairs = newComparisonPairs;');
    expect(source).toContain('patch._comparisons = Math.max(comparisons + 1, newComparisonPairs.length);');
    expect(source).toContain("else { upd('_compareStructure', sel.id); playSound('compareView'); }");
    expect(source).not.toContain("_compareStructure: sel.id, _comparisons: comparisons + 1");
  });
});
describe('Anatomy Lab comparison-pair integrity', () => {
  it('deduplicates reversed restored pairs and confirms recorded comparisons', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'ribs',
      _compareStructure: 'skull',
      _comparisonPairs: ['skull::ribs', 'ribs::skull', 'forged::skull'],
      _comparisons: 0
    });
    expect(html).toContain('Pair recorded');
    expect(html).not.toContain('Record pair');
  });

  it('offers recovery for a restored comparison that was never recorded', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'ribs',
      _compareStructure: 'skull', _comparisonPairs: { invalid: true }
    });
    expect(html).toContain('Record pair');
    expect(html).not.toContain('Pair recorded');
  });

  it('routes all interactive structure selection through comparison tracking', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('function selectionPatch(structureId, extraPatch)');
    expect(source).toContain('updMulti(selectionPatch(closest.id))');
    expect(source).toContain('updMulti(selectionPatch(navList[nextIdx].id))');
    expect(source).toContain('resultPatch = structureFocusPatch(result.structure.id');
    expect(source).toContain('updMulti(selectionPatch(st.id))');
    expect(source).toContain('return comparisonTrackingPatch(structureId, patch, context.systemId);');
  });
});
describe('Anatomy Lab guided-mode continuity', () => {
  it('offers live tour recovery when the restored diagram is not focused', () => {
    const html = renderAnatomy({
      _activeTab: 'tour', _tourActive: true, _tourStepIdx: 0,
      system: 'skeletal', view: 'anterior', selectedStructure: null
    });
    expect(html).toContain('Diagram: Skeletal - Anterior');
    expect(html).toContain('Focus diagram');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
  });

  it('recognizes a tour diagram that already matches its current step', () => {
    const html = renderAnatomy({
      _activeTab: 'tour', _tourActive: true, _tourStepIdx: 0,
      system: 'skeletal', view: 'anterior', selectedStructure: 'skull'
    });
    expect(html).toContain('Diagram: Skeletal - Anterior');
    expect(html).not.toContain('Focus diagram');
  });

  it('focuses the current structure whenever a guided tab is entered or resumed', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('updMulti(structureFocusPatch(tabTourStep.structureId, tourPatch));');
    expect(source).toContain("updMulti(structureFocusPatch(tabPathwayStep.structure, { _activeTab: tab, _pathwayStep: pathwayStepIdx }))");
    expect(source).toContain("updMulti(structureFocusPatch(tabFlashcard.id, { _activeTab: tab }))");
    expect(source).toContain("_flashcardIdx: 0, _flashcardFlipped: false");
  });

  it('avoids returning the same random flashcard and announces guided completions', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('1 + Math.floor(Math.random() * (flashcardPool.length - 1))');
    expect(source).toContain('var randIdx = (flashcardIdx + randomOffset) % flashcardPool.length;');
    expect(source).toContain("announceToSR('Guided anatomy tour complete. Returning to Explore.')");
    expect(source).toContain("announceToSR('Pathway complete: ' + pw.title + '.')");
  });
});
describe('Anatomy Lab flashcard interaction semantics', () => {
  it('uses a separate reveal control and live study content', () => {
    const html = renderAnatomy({
      _activeTab: 'flashcards', system: 'skeletal', complexity: 3,
      _flashcardIdx: 0, _flashcardFlipped: false
    });
    expect(html).toContain('role="group" aria-label="Flashcard 1 of');
    expect(html).toContain('id="anatomy-flashcard-content" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('aria-expanded="false" aria-controls="anatomy-flashcard-content"');
    expect(html).toContain('Reveal function');
    expect(html).toContain('role="toolbar" aria-label="Flashcard navigation"');
  });

  it('shows a dedicated hide control on the revealed face', () => {
    const html = renderAnatomy({
      _activeTab: 'flashcards', system: 'skeletal', complexity: 3,
      _flashcardIdx: 0, _flashcardFlipped: true
    });
    expect(html).toContain('aria-expanded="true" aria-controls="anatomy-flashcard-content"');
    expect(html).toContain('Show structure name');
    expect(html).toContain('FUNCTION');
  });

  it('does not nest study content and text-to-speech inside the flip button', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("h('div', { role: 'group', 'aria-label': 'Flashcard '");
    expect(source).toContain("role: 'toolbar', 'aria-label': 'Flashcard navigation'");
    expect(source).not.toContain("h('button', { 'aria-label': (flashcardPool[flashcardIdx]");
    expect(source).toContain("flashcardPool.length > 0 ? (flashcardIdx + 1) + '/' + flashcardPool.length : '0/0'");
  });
});
describe('Anatomy Lab connection disclosure semantics', () => {
  it('renders expanded connections as labeled regions with diagram actions', () => {
    const html = renderAnatomy({
      _activeTab: 'connections', system: 'circulatory',
      _expandedConn: 'conn_1', _connectionsViewed: { conn_1: true }
    });
    expect(html).toContain('aria-label="Collapse Gas Exchange" aria-expanded="true" aria-controls="anatomy-connection-conn_1"');
    expect(html).toContain('id="anatomy-connection-conn_1" role="region" aria-label="Gas Exchange details"');
    expect(html).toContain('role="group" aria-label="Connected system diagrams"');
    expect(html).toContain('aria-label="Show Circulatory diagram for Gas Exchange" aria-pressed="true"');
    expect(html).toContain('aria-label="Show Respiratory diagram for Gas Exchange" aria-pressed="false"');
  });

  it('does not expose forged restored connection details', () => {
    const html = renderAnatomy({ _activeTab: 'connections', _expandedConn: 'forged_connection' });
    expect(html).not.toContain('forged_connection');
    expect(html).not.toContain('role="region" aria-label="Gas Exchange details"');
    expect(html).toContain('aria-label="Expand Gas Exchange" aria-expanded="false"');
  });

  it('uses shared system cleanup for the rail and connection diagram buttons', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('function systemSelectionPatch(systemId)');
    expect(source).toContain('function showAnatomySystem(systemId, contextLabel)');
    expect(source).toContain('onClick: function() { showAnatomySystem(key); }');
    expect(source).toContain('onClick: function() { showAnatomySystem(connectionSystemId, conn.title); }');
    expect(source).toContain("announceToSR('Showing ' + SYSTEMS[systemId].name + ' diagram for ' + contextLabel + '.')");
    expect(source).not.toContain("return h('button', { 'aria-label': conn.title");
  });
});
describe('Anatomy Lab adaptive study support', () => {
  it('lets learners persist a validated confidence rating from structure details', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'skull',
      _structureConfidence: { skull: 'practice', forged: 'mastered' }
    });
    expect(html).toContain('aria-label="Learning confidence for Skull (Cranium)"');
    expect(html).toContain('>! Need practice</button>');
    expect(html).toContain('Saved to your study plan');
    expect(html).not.toContain('forged');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("safeEnumMap(d._structureConfidence, knownStructureIds, CONFIDENCE_LEVELS)");
    expect(source).toContain("var CONFIDENCE_LEVELS = ['practice', 'learning', 'mastered'];");
  });

  it('filters structures by unseen, review, and mastered study states', () => {
    const mastered = renderAnatomy({
      system: 'skeletal', complexity: 3, _studyFilter: 'mastered',
      _structureConfidence: { skull: 'mastered' }
    });
    expect(mastered).toContain('aria-label="Filter structures by study status"');
    expect(mastered).toContain('Skeletal - anterior - 1 matching');
    expect(mastered).toContain('Got it');

    const emptyReview = renderAnatomy({ system: 'skeletal', complexity: 3, _studyFilter: 'review' });
    expect(emptyReview).toContain('No structures match this study filter.');
    expect(emptyReview).toContain('Show all structures');

    const invalidFilter = renderAnatomy({ system: 'skeletal', complexity: 3, _studyFilter: 'forged' });
    expect(invalidFilter).toContain('Skeletal - anterior - 19 matching');
  });

  it('recommends a next step from current progress and review needs', () => {
    const newLearner = renderAnatomy({ system: 'skeletal', complexity: 3 });
    expect(newLearner).toContain('aria-label="Recommended next study step"');
    expect(newLearner).toContain('Take the guided tour');
    expect(newLearner).toContain('Start tour');

    const returningLearner = renderAnatomy({
      system: 'skeletal', complexity: 3, _tourCompleted: true,
      _structuresViewed: { skull: true }, _structureConfidence: { skull: 'practice' }
    });
    expect(returningLearner).toContain('Review Skull (Cranium)');
    expect(returningLearner).toContain('Review now');
  });

  it('adds confidence reflection only after a flashcard answer is revealed', () => {
    const hidden = renderAnatomy({ _activeTab: 'flashcards', _flashcardFlipped: false });
    expect(hidden).not.toContain('Learning confidence for Skull (Cranium)');
    const revealed = renderAnatomy({ _activeTab: 'flashcards', _flashcardFlipped: true });
    expect(revealed).toContain('Learning confidence for Skull (Cranium)');
  });
});

describe('Anatomy Lab visual hierarchy and canvas legibility', () => {
  it('uses a compact atlas stage with balanced system navigation', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("grid-template-columns:repeat(5,minmax(0,1fr))");
    expect(source).toContain("border-top:4px solid var(--anatomy-accent)");
    expect(source).toContain("backgroundSize: '28px 28px,28px 28px,100% 100%'");
    expect(source).toContain(".anatomy-mode-card p{display:none}");

    const html = renderAnatomy({ system: 'circulatory', complexity: 3 });
    expect(html).toContain('class="anatomy-mode-icon"');
    expect(html).toContain('radial-gradient(circle at 50% 36%');
    expect(html).toContain('border border-slate-300');
  });

  it('keeps long selected and hovered labels inside the canvas', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("var selectedLabel = st.name.length > 26");
    expect(source).toContain('pillX = Math.max(5, Math.min(W - pillW - 5, pillX));');
    expect(source).toContain('if (htx < 4) htx = 4;');
    expect(source).toContain('if (htx + boxW > W - 4) htx = W - boxW - 4;');
  });

  it('keeps inactive structure pins quiet while preserving selected and study-state hierarchy', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var r = isSel ? 10 : isHover ? 8 : markerConfidence ? 6 : 4.5;');
    expect(source).toContain('if (!isSel && !isHover && !markerConfidence) {');
    expect(source).toContain("cCtx.fillStyle = 'rgba(255,255,255,0.92)'; cCtx.fill();");
    expect(source).toContain("cCtx.strokeStyle = sys.accent; cCtx.lineWidth = 1.25; cCtx.stroke();");
    expect(source).toContain("cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 1.6; cCtx.stroke();");
  });

  it('uses neutral inactive tabs so the active learning mode is visually dominant', () => {
    const explore = renderAnatomy({ _activeTab: 'explore' });
    expect(explore).toContain('bg-slate-800 text-white border border-slate-800');
    expect(explore).toContain('bg-white text-slate-600 hover:bg-slate-100 border border-slate-300');

    const pathways = renderAnatomy({ _activeTab: 'pathways' });
    expect(pathways).toContain('bg-rose-700 text-white border border-rose-700');
  });

  it('shows system-level exploration progress with accessible labels', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3,
      _structuresViewed: { skull: true }
    });
    expect(html).toContain('class="anatomy-system-button');
    expect(html).toContain('aria-label="Skeletal. 1 of ');
    expect(html).toContain(' structures explored."');
    expect(html).toContain('class="anatomy-system-meter"');
  });

  it('reflows learning modes into a touch-friendly grid on small screens', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('@media (max-width:720px)');
    expect(source).toContain('.anatomy-tab-strip{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))}');
    expect(source).toContain('.anatomy-tab-strip{grid-template-columns:1fr 1fr}');
    expect(source).not.toContain('overflow-x:auto;flex-wrap:nowrap');
  });

  it('adds a larger, ringed hover state without obscuring selection', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var isHover = hoverStructure === st.id;');
    expect(source).toContain('if (isHover && !isSel)');
    expect(source).toContain("cCtx.strokeStyle = sys.accent + 'a0'; cCtx.lineWidth = 2; cCtx.stroke();");
  });

  it('deconflicts dense markers while keeping anatomical anchors visible', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var markerLayout = {};');
    expect(source).toContain('return Math.sqrt(dx * dx + dy * dy) < 18;');
    expect(source).toContain('var placedMarker = markerPosition(st);');
    expect(source).toContain('cCtx.moveTo(placedMarker.baseX * W, placedMarker.baseY * H);');
    expect(source).toContain('var clickMarker = markerPosition(st);');
    expect(source).toContain('var hoverMarker = markerPosition(st);');
  });

  it('provides accessible zoom, pan, and reset controls with persisted view state', () => {
    const defaultHtml = renderAnatomy({ system: 'nervous', complexity: 3 });
    expect(defaultHtml).toContain('aria-label="Diagram zoom and pan controls"');
    expect(defaultHtml).toContain('aria-label="Zoom in on anatomy diagram"');
    expect(defaultHtml).toContain('aria-label="Pan anatomy diagram left"');
    expect(defaultHtml).toContain('aria-label="Reset anatomy diagram view"');
    expect(defaultHtml).toContain('class="anatomy-canvas-frame"');
    expect(defaultHtml).toContain('aria-label="Zoom 100 percent"');
    expect(defaultHtml).toContain('translate(0px,0px) scale(1)');
    expect(defaultHtml).not.toContain('data-anatomy-minimap="true"');

    const zoomedHtml = renderAnatomy({
      system: 'nervous', complexity: 3,
      _canvasZoom: 1.25, _canvasPanX: 18, _canvasPanY: -18
    });
    expect(zoomedHtml).toContain('>125%</span>');
    expect(zoomedHtml).toContain('translate(18px,-18px) scale(1.25)');
    expect(zoomedHtml).toContain('aria-label="Zoom 125 percent, diagram moved 18 pixels right, diagram moved 18 pixels up"');
    expect(zoomedHtml).toContain('class="anatomy-canvas border-2 is-zoomed"');
  });

  it('explains patient perspective visually and to assistive technology', () => {
    const anterior = renderAnatomy({ view: 'anterior' });
    expect(anterior).toContain('Patient right is on your left');
    expect(anterior).toContain('Patient perspective. R appears on the viewer left and L appears on the viewer right.');
    expect(anterior).toContain('Patient right is on the viewer left; patient left is on the viewer right.');

    const posterior = renderAnatomy({ view: 'posterior' });
    expect(posterior).toContain('Patient left/right align with you');
    expect(posterior).toContain('Patient perspective. L and R align with the viewer.');
  });

  it('keeps the enhanced canvas responsive and keyboard navigable', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('.anatomy-canvas-frame{position:relative;width:min(360px,100%);aspect-ratio:360/520');
    expect(source).toContain('.anatomy-canvas-toolbar-group{display:flex;align-items:center;gap:3px;flex-wrap:wrap');
    expect(source).toContain("if (e.shiftKey && (e.key === 'ArrowDown'");
    expect(source).toContain("if (e.key === '+' || e.key === '=')");
    expect(source).toContain("if (e.key === '0')");
  });

  it('supports direct drag panning and controlled wheel zoom without accidental selection', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var handleCanvasPointerDown = function(e)');
    expect(source).toContain('var handleCanvasPointerMove = function(e)');
    expect(source).toContain('var finishCanvasPointerGesture = function(e, shouldCommit)');
    expect(source).toContain('canvas.setPointerCapture(e.pointerId)');
    expect(source).toContain('canvas.releasePointerCapture(e.pointerId)');
    expect(source).toContain('if (drag.moved) canvas._anatomySuppressClick = true;');
    expect(source).toContain('if (e.currentTarget._anatomySuppressClick)');
    expect(source).toContain('if (!(e.ctrlKey || e.metaKey)) return;');
    expect(source).toContain('onPointerCancel: handleCanvasPointerCancel');
    expect(source).toContain('onWheel: handleCanvasWheel');
    expect(source).toContain('.anatomy-canvas.is-zoomed{touch-action:none;cursor:grab;}');
  });

  it('supports 200 percent inspection with axis-aware bounds and a minimap', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'skull',
      _canvasZoom: 2, _canvasPanX: 999, _canvasPanY: -999
    });
    expect(html).toContain('aria-label="Zoom 200 percent, diagram moved 180 pixels right, diagram moved 260 pixels up"');
    expect(html).toContain('translate(180px,-260px) scale(2)');
    expect(html).toContain('data-anatomy-minimap="true"');
    expect(html).toContain('class="anatomy-minimap-viewport"');
    expect(html).toContain('left:0%;top:50%;width:50%;height:50%');
    expect(html).toContain('class="anatomy-minimap-selected"');
  });

  it('can focus the viewport on the selected anatomical structure', () => {
    const selected = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'skull'
    });
    expect(selected).toContain('aria-label="Focus anatomy diagram on Skull (Cranium)"');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var CANVAS_ZOOM_LEVELS = [1, 1.25, 1.5, 2];');
    expect(source).toContain('function canvasPanLimitForZoom(zoom, axis)');
    expect(source).toContain("return Math.round((axis === 'y' ? 520 : 360) * (zoom - 1) / 2);");
    expect(source).toContain('function focusSelectedStructure()');
    expect(source).toContain('var focusPanX = (0.5 - focusMarker.x) * 360 * focusZoom;');
    expect(source).toContain('var minimapViewportWidth = 100 / canvasZoom;');
  });

  it('uses a five-column touch control grid with 44 pixel targets on narrow screens', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('.anatomy-canvas-toolbar{align-items:stretch;flex-direction:column}');
    expect(source).toContain('.anatomy-canvas-toolbar-group{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));width:100%;gap:5px}');
    expect(source).toContain('.anatomy-canvas-toolbar button{width:100%;min-width:0;min-height:44px}');
    expect(source).toContain('.anatomy-minimap{right:6px;bottom:6px}');
  });

  it('exposes canvas shortcuts and linked instructions to assistive technology', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'skull'
    });
    expect(html).toContain('aria-describedby="anatomy-canvas-instructions"');
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight');
    expect(html).toContain('id="anatomy-canvas-instructions"');
    expect(html).toContain('aria-keyshortcuts="F"');
    expect(html).toContain('aria-keyshortcuts="Home 0"');
    expect(html).toContain('Press F to focus the selected structure');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("if (e.key === 'Home')");
    expect(source).toContain("String(e.key || '').toLowerCase() === 'f' && sel");
  });

  it('retains visible control boundaries in Windows forced-colors mode', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('@media (forced-colors:active)');
    expect(source).toContain('border:1px solid CanvasText!important');
    expect(source).toContain('.anatomy-marker-legend-symbol{forced-color-adjust:auto');
    expect(source).toContain('.anatomy-minimap-viewport{border-color:Highlight!important}');
  });

  it('maps study confidence to non-color symbols on anatomy markers', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('var markerConfidence = structureConfidence[st.id] || null;');
    expect(source).toContain("markerConfidence === 'practice' ? '!' : markerConfidence === 'learning' ? '~' : '\u2713'");
    expect(source).toContain("cCtx.strokeText(markerStatusSymbol, px, py + 0.5);");
    expect(source).toContain("cCtx.fillText(markerStatusSymbol, px, py + 0.5);");
    expect(source).toContain('var markerStatusVisible = !spotterActive || spotterFeedback !== null;');
  });

  it('renders a compact marker learning-status legend', () => {
    const html = renderAnatomy({ system: 'skeletal', complexity: 3 });
    expect(html).toContain('aria-label="Marker learning status legend"');
    expect(html).toContain('class="anatomy-marker-legend-title">Pin status');
    expect(html).toContain('data-status="unrated"');
    expect(html).toContain('data-status="practice"');
    expect(html).toContain('data-status="learning"');
    expect(html).toContain('data-status="mastered"');
    expect(html).toContain('>Review</span>');
    expect(html).toContain('>Got it</span>');
  });

  it('announces the selected structure study status in the canvas description', () => {
    const mastered = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'skull',
      _structureConfidence: { skull: 'mastered' }
    });
    expect(mastered).toContain('Skull (Cranium) selected. Study status Got it.');

    const unrated = renderAnatomy({
      system: 'skeletal', complexity: 3, selectedStructure: 'skull'
    });
    expect(unrated).toContain('Skull (Cranium) selected. Study status Unrated.');
  });
});
describe('Anatomy regional deep-dive atlas', () => {
  it('offers the heart atlas from structure details without crowding the default view', () => {
    const closed = renderAnatomy({ system: 'circulatory', complexity: 3, selectedStructure: 'heart' });
    expect(closed).toContain('aria-label="Open Heart deep dive"');
    expect(closed).toContain('>Deep dive</button>');
    expect(closed).not.toContain('data-anatomy-atlas="heart"');

    const open = renderAnatomy({
      system: 'circulatory',
      complexity: 3,
      selectedStructure: 'heart',
      _regionalAtlasOpen: 'heart'
    });
    expect(open).toContain('data-anatomy-atlas="heart"');
    expect(open).toContain('Four-chamber heart and double-circulation diagram');
    expect(open).toContain('aria-label="Blood-flow steps"');
    expect(open).toContain('1. Venous return');
    expect(open).toContain('4. To the body');
  });

  it('clamps restored atlas steps and exposes motion controls and live narration', () => {
    const html = renderAnatomy({
      system: 'circulatory',
      complexity: 3,
      selectedStructure: 'heart',
      _regionalAtlasOpen: 'heart',
      _regionalAtlasStep: 999,
      _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play blood-flow animation"');
    expect(html).toContain('Left ventricle');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
  });

  it('honors reduced motion and keeps the atlas responsive on small screens', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('@media (prefers-reduced-motion:reduce)');
    expect(source).toContain('.anatomy-atlas-steps{grid-template-columns:1fr 1fr}');
    expect(source).toContain("aria-labelledby': 'anatomy-heart-atlas-title anatomy-heart-atlas-desc'");
  });
});
describe('Anatomy Kidney Filtration Scale Bridge', () => {
  it('connects posterior body location, kidney regions, and nephron processing', () => {
    const closed = renderAnatomy({
      system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys'
    });
    expect(closed).toContain('aria-label="Open Kidney Filtration Scale Bridge"');
    expect(closed).not.toContain('data-anatomy-atlas="kidneys"');

    const open = renderAnatomy({
      system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys',
      _regionalAtlasOpen: 'kidneys'
    });
    expect(open).toContain('data-anatomy-atlas="kidneys"');
    expect(open).toContain('data-anatomy-scale-bridge="kidneys"');
    expect(open).toContain('data-anatomy-atlas-step="glomerular_filtration"');
    expect(open).toContain('Body-to-kidney-to-nephron Scale Bridge diagram');
    expect(open).toContain('aria-label="Scale progression: posterior body location to kidney cross-section to nephron microanatomy"');
    expect(open).toContain('aria-label="Nephron processing steps"');
    expect(open).toContain('BODY LOCATION');
    expect(open).toContain('KIDNEY CROSS-SECTION');
    expect(open).toContain('NEPHRON MICROANATOMY');
    expect(open).toContain('Posterior body');
    expect(open).toContain('Kidney regions');
    expect(open).toContain('Nephron flow');
    expect(open).toContain('Step 1 of 4');
    expect(open).toContain('glomerulus');
    expect(open).toContain('proximal tubule');
    expect(open).toContain('loop of Henle');
    expect(open).toContain('collecting duct');
  });

  it('clamps nephron steps and exposes paused flow with final urine narration', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys',
      _regionalAtlasOpen: 'kidneys', _regionalAtlasStep: 50, _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play filtrate-flow animation"');
    expect(html).toContain('data-anatomy-atlas-step="urine_concentration"');
    expect(html).toContain('4. Urine formation');
    expect(html).toContain('before urine enters the renal pelvis and ureter');
    expect(html).toContain('Step 4 of 4');
  });
});
describe('Anatomy alveolar gas-exchange deep dive', () => {
  it('opens a labeled alveolus, barrier, and capillary atlas', () => {
    const closed = renderAnatomy({
      system: 'respiratory', view: 'anterior', complexity: 3, selectedStructure: 'alveoli'
    });
    expect(closed).toContain('aria-label="Open Alveolus and gas-exchange deep dive"');
    expect(closed).not.toContain('data-anatomy-atlas="alveoli"');

    const open = renderAnatomy({
      system: 'respiratory', view: 'anterior', complexity: 3, selectedStructure: 'alveoli',
      _regionalAtlasOpen: 'alveoli'
    });
    expect(open).toContain('data-anatomy-atlas="alveoli"');
    expect(open).toContain('Alveolus, air-blood barrier, and pulmonary capillary gas-exchange diagram');
    expect(open).toContain('aria-label="Alveolar gas-exchange steps"');
    expect(open).toContain('AIR-BLOOD BARRIER');
    expect(open).toContain('type I alveolar cell');
    expect(open).toContain('capillary endothelium');
    expect(open).toContain('PULMONARY CAPILLARY');
  });

  it('clamps gas-exchange steps and exposes paused transport narration', () => {
    const html = renderAnatomy({
      system: 'respiratory', view: 'anterior', complexity: 3, selectedStructure: 'alveoli',
      _regionalAtlasOpen: 'alveoli', _regionalAtlasStep: 99, _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play gas-exchange animation"');
    expect(html).toContain('4. Transport onward');
    expect(html).toContain('efficient exchange requires matched ventilation and perfusion');
  });
});
describe('Anatomy knee joint and movement deep dive', () => {
  it('opens a labeled lateral knee cutaway from the patella structure', () => {
    const closed = renderAnatomy({
      system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'patella'
    });
    expect(closed).toContain('aria-label="Open Knee joint and movement deep dive"');
    expect(closed).not.toContain('data-anatomy-atlas="patella"');

    const open = renderAnatomy({
      system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'patella',
      _regionalAtlasOpen: 'patella'
    });
    expect(open).toContain('data-anatomy-atlas="patella"');
    expect(open).toContain('Lateral knee joint cutaway and movement mechanics diagram');
    expect(open).toContain('aria-label="Knee structure and movement steps"');
    expect(open).toContain('articular cartilage');
    expect(open).toContain('meniscus');
    expect(open).toContain('ACL');
    expect(open).toContain('PCL');
    expect(open).toContain('patellar tendon');
  });

  it('clamps knee phases and exposes paused stability narration', () => {
    const html = renderAnatomy({
      system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'patella',
      _regionalAtlasOpen: 'patella', _regionalAtlasStep: 500, _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play knee-mechanics animation"');
    expect(html).toContain('4. Stability');
    expect(html).toContain('The ACL limits anterior tibial translation and rotation');
  });
});
describe('Anatomy neuromuscular-junction deep dive', () => {
  it('opens a labeled motor-end-plate and sarcomere atlas from biceps', () => {
    const closed = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps'
    });
    expect(closed).toContain('aria-label="Open Neuromuscular junction and contraction deep dive"');
    expect(closed).not.toContain('data-anatomy-atlas="biceps"');

    const open = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps'
    });
    expect(open).toContain('data-anatomy-atlas="biceps"');
    expect(open).toContain('Neuromuscular junction, calcium release, and sarcomere contraction diagram');
    expect(open).toContain('aria-label="Neuromuscular activation steps"');
    expect(open).toContain('axon terminal');
    expect(open).toContain('synaptic vesicles');
    expect(open).toContain('nicotinic ACh receptors');
    expect(open).toContain('T-tubule');
    expect(open).toContain('sarcoplasmic reticulum');
    expect(open).toContain('SARCOMERE');
  });

  it('clamps activation phases and exposes paused contraction narration', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _regionalAtlasStep: 1000, _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play muscle-activation animation"');
    expect(html).toContain('4. Sarcomere shortens');
    expect(html).toContain('ATP-powered myosin cross-bridge cycles');
  });
});

describe('Anatomy Lens focused-diagram gallery', () => {
  it('stays compact by default and exposes an accessible disclosure control', () => {
    const html = renderAnatomy({ system: 'skeletal', complexity: 3 });
    expect(html).toContain('aria-controls="anatomy-lens-panel"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-anatomy-lens="true"');
  });

  it('offers focused deep dives and hands neuroanatomy to its specialist tool', () => {
    const html = renderAnatomy({
      system: 'skeletal', complexity: 3, _showAnatomyLens: true, _anatomyLensViewed: { heart: true }
    });
    expect(html).toContain('data-anatomy-lens="true"');
    expect(html).toContain('id="anatomy-lens-title">Anatomy Lens');
    expect((html.match(/data-anatomy-lens-id=/g) || [])).toHaveLength(8);
    expect(html).toContain('data-anatomy-lens-specialist="brainAtlas"');
    expect(html).toContain('instead of duplicating it here');
    expect(html).toContain('1/8 explored');
  });

  it('sanitizes saved progress and launches deep dives with one coherent state patch', () => {
    const malformed = renderAnatomy({ _showAnatomyLens: true, _anatomyLensViewed: 'heart' });
    expect(malformed).toContain('0/8 explored');
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('function openAnatomyLensItem(item)');
    expect(source).toContain('function openAnatomyScaleBridge(structureId, stepIndex, announcement)');
    expect(source).toContain('_regionalAtlasStep: safeStep');
    expect(source).toContain("_regionalAtlasOpen: item.structureId");
    expect(source).toContain('_anatomyLensViewed: viewedPatch');
    expect(source).toContain("setStemLabTool('brainAtlas')");
  });
});

describe('Anatomy liver lobule Scale Bridge', () => {
  it('connects body location, the liver organ, and labeled lobule microanatomy', () => {
    const closed = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'liver'
    });
    expect(closed).toContain('aria-label="Open Liver lobule Scale Bridge"');
    expect(closed).not.toContain('data-anatomy-atlas="liver"');

    const open = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'liver',
      _regionalAtlasOpen: 'liver'
    });
    expect(open).toContain('data-anatomy-atlas="liver"');
    expect(open).toContain('data-anatomy-scale-bridge="liver"');
    expect(open).toContain('data-anatomy-atlas-step="portal_entry"');
    expect(open).toContain('Step 1 of 4');
    expect(open).toContain('data-scale-continuation="sm_intestine"');
    expect(open).toContain('Trace nutrient absorption');
    expect(open).toContain('aria-label="Scale progression: body location to liver organ to hepatic lobule"');
    expect(open).toContain('Body-to-liver-to-lobule Scale Bridge diagram');
    expect(open).toContain('aria-label="Liver lobule processing steps"');
    expect(open).toContain('BODY LOCATION');
    expect(open).toContain('MICROANATOMY');
    expect(open).toContain('portal vein');
    expect(open).toContain('hepatic artery');
    expect(open).toContain('central vein');
    expect(open).toContain('bile duct');
  });

  it('clamps liver stages and explains bile flow opposite the blood direction', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'liver',
      _regionalAtlasOpen: 'liver', _regionalAtlasStep: 100, _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play liver-flow animation"');
    expect(html).toContain('4. Bile flows outward');
    expect(html).toContain('data-anatomy-atlas-step="bile_flow"');
    expect(html).toContain('opposite the blood-flow direction');
  });
});

describe('Anatomy intestinal villus Scale Bridge', () => {
  it('connects the body region, intestinal wall, and nutrient-routing microanatomy', () => {
    const closed = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'sm_intestine'
    });
    expect(closed).toContain('aria-label="Open Intestinal villus Scale Bridge"');
    expect(closed).not.toContain('data-anatomy-atlas="sm_intestine"');

    const open = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'sm_intestine',
      _regionalAtlasOpen: 'sm_intestine'
    });
    expect(open).toContain('data-anatomy-atlas="sm_intestine"');
    expect(open).toContain('data-anatomy-scale-bridge="sm_intestine"');
    expect(open).toContain('data-anatomy-atlas-step="brush_border"');
    expect(open).toContain('Step 1 of 4');
    expect(open).toContain('data-scale-continuation="liver"');
    expect(open).toContain('Continue to liver processing');
    expect(open).toContain('aria-label="Scale progression: body region to intestinal wall to villus microanatomy"');
    expect(open).toContain('Body-to-small-intestine-to-villus Scale Bridge diagram');
    expect(open).toContain('aria-label="Intestinal villus absorption steps"');
    expect(open).toContain('BODY REGION');
    expect(open).toContain('INTESTINAL WALL');
    expect(open).toContain('microvilli');
    expect(open).toContain('enterocytes');
    expect(open).toContain('capillaries');
    expect(open).toContain('lacteal');
    expect(open).toContain('to portal blood');
    expect(open).toContain('to lymph');
  });

  it('clamps absorption stages and distinguishes water uptake from fat transport', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'sm_intestine',
      _regionalAtlasOpen: 'sm_intestine', _regionalAtlasStep: 500, _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play nutrient-absorption animation"');
    expect(html).toContain('4. Water and ions');
    expect(html).toContain('Water follows osmotic gradients');
    expect(html).toContain('data-anatomy-atlas-step="water_balance"');
    const fatHtml = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'sm_intestine',
      _regionalAtlasOpen: 'sm_intestine', _regionalAtlasStep: 2
    });
    expect(fatHtml).toContain('3. Into the lacteal');
    expect(fatHtml).toContain('Long-chain lipids are rebuilt into triglycerides');
  });
});
describe('Anatomy Skin Repair Scale Bridge', () => {
  it('connects body surface, skin layers, and the wound-repair zone', () => {
    const closed = renderAnatomy({
      system: 'integumentary', view: 'anterior', complexity: 3, selectedStructure: 'epidermis'
    });
    expect(closed).toContain('aria-label="Open Skin Repair Scale Bridge"');
    expect(closed).not.toContain('data-anatomy-atlas="epidermis"');

    const open = renderAnatomy({
      system: 'integumentary', view: 'anterior', complexity: 3, selectedStructure: 'epidermis',
      _regionalAtlasOpen: 'epidermis'
    });
    expect(open).toContain('data-anatomy-atlas="epidermis"');
    expect(open).toContain('data-anatomy-scale-bridge="epidermis"');
    expect(open).toContain('data-anatomy-atlas-step="hemostasis"');
    expect(open).toContain('Body-to-skin-to-wound-repair Scale Bridge diagram');
    expect(open).toContain('aria-label="Scale progression: body surface to skin layers to wound repair zone"');
    expect(open).toContain('aria-label="Skin repair stages"');
    expect(open).toContain('epidermis');
    expect(open).toContain('dermis');
    expect(open).toContain('hypodermis');
    expect(open).toContain('platelets + fibrin');
    expect(open).toContain('immune cleanup');
    expect(open).toContain('granulation tissue');
    expect(open).toContain('remodeled collagen');
    expect(open).toContain('Step 1 of 4');
  });

  it('clamps repair phases and exposes paused remodeling narration', () => {
    const html = renderAnatomy({
      system: 'integumentary', view: 'anterior', complexity: 3, selectedStructure: 'epidermis',
      _regionalAtlasOpen: 'epidermis', _regionalAtlasStep: 99, _regionalAtlasPlaying: false
    });
    expect(html).toContain('class="anatomy-atlas is-paused"');
    expect(html).toContain('aria-label="Play skin-repair animation"');
    expect(html).toContain('data-anatomy-atlas-step="remodeling"');
    expect(html).toContain('4. Remodeling');
    expect(html).toContain('Collagen fibers are replaced and reorganized');
    expect(html).toContain('Step 4 of 4');
  });
});
describe('Anatomy atlas shared visual refinement', () => {
  const diagrams = [
    { id: 'heart', system: 'circulatory', view: 'anterior', firstStep: 'venous_return', key: 'Blood oxygenation key' },
    { id: 'kidneys', system: 'organs', view: 'posterior', firstStep: 'glomerular_filtration', key: 'Kidney flow key' },
    { id: 'alveoli', system: 'respiratory', view: 'anterior', firstStep: 'alveolar_ventilation', key: 'Gas-exchange key' },
    { id: 'patella', system: 'skeletal', view: 'anterior', firstStep: 'knee_architecture', key: 'Knee mechanics key' },
    { id: 'biceps', system: 'muscular', view: 'anterior', firstStep: 'motor_terminal', key: 'Muscle activation key' },
    { id: 'liver', system: 'organs', view: 'anterior', firstStep: 'portal_entry', key: 'Liver transport key' },
    { id: 'sm_intestine', system: 'organs', view: 'anterior', firstStep: 'brush_border', key: 'Villus transport key' },
    { id: 'epidermis', system: 'integumentary', view: 'anterior', firstStep: 'hemostasis', key: 'Skin repair key' }
  ];

  it('gives every focused diagram a labeled visual key and explicit step state', () => {
    diagrams.forEach((diagram) => {
      const html = renderAnatomy({
        system: diagram.system, view: diagram.view, complexity: 3, selectedStructure: diagram.id,
        _regionalAtlasOpen: diagram.id
      });
      expect(html).toContain(`data-anatomy-visual-key="${diagram.id}"`);
      expect(html).toContain(`aria-label="${diagram.key}"`);
      expect(html).toContain(`data-anatomy-atlas-step="${diagram.firstStep}"`);
      expect(html).toContain('Step 1 of 4');
    });
  });

  it('adds scale and orientation cues to the four original regional diagrams', () => {
    const cases = [
      { id: 'heart', system: 'circulatory', view: 'anterior', cue: 'Orientation progression: body return to heart and lungs to body supply' },
      { id: 'alveoli', system: 'respiratory', view: 'anterior', cue: 'Scale progression: conducting airway to air-blood barrier to capillary blood' },
      { id: 'patella', system: 'skeletal', view: 'anterior', cue: 'Scale progression: lower limb to knee cutaway to movement forces' },
      { id: 'biceps', system: 'muscular', view: 'anterior', cue: 'Scale progression: motor neuron to muscle fiber to sarcomere' }
    ];
    cases.forEach((diagram) => {
      const html = renderAnatomy({
        system: diagram.system, view: diagram.view, complexity: 3, selectedStructure: diagram.id,
        _regionalAtlasOpen: diagram.id
      });
      expect(html).toContain(`aria-label="${diagram.cue}"`);
    });
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('.anatomy-atlas-stage svg text{paint-order:stroke');
    expect(source).toContain('.anatomy-scale-path span:not(.anatomy-scale-arrow){white-space:normal}');
  });
});
describe('Anatomy diagram Mechanism Pass', () => {
  const mechanismCases = [
    { id: 'kidneys', system: 'organs', view: 'posterior', step: 1, mechanism: 'proximal-reabsorption', label: 'glucose · Na+ · water return' },
    { id: 'alveoli', system: 'respiratory', view: 'anterior', step: 1, mechanism: 'oxygen-binding', label: 'O2 binds hemoglobin' },
    { id: 'patella', system: 'skeletal', view: 'anterior', step: 2, mechanism: 'tibial-flexion-geometry', label: 'flexed tibia position' },
    { id: 'biceps', system: 'muscular', view: 'anterior', step: 3, mechanism: 'cross-bridge-power-stroke', label: 'Z discs move closer' },
    { id: 'liver', system: 'organs', view: 'anterior', step: 3, mechanism: 'bile-counterflow', label: 'bile moves outward · opposite blood flow' },
    { id: 'sm_intestine', system: 'organs', view: 'anterior', step: 2, mechanism: 'chylomicron-lymph-transport', label: 'chylomicrons enter lymph' },
    { id: 'epidermis', system: 'integumentary', view: 'anterior', step: 2, mechanism: 'epithelial-closure-angiogenesis', label: 'wound narrows · new vessels grow' }
  ];

  it('activates a structure-changing mechanism layer in every non-cardiac diagram', () => {
    mechanismCases.forEach((diagram) => {
      const html = renderAnatomy({
        system: diagram.system, view: diagram.view, complexity: 3, selectedStructure: diagram.id,
        _regionalAtlasOpen: diagram.id, _regionalAtlasStep: diagram.step
      });
      expect(html).toContain(`class="anatomy-mechanism-layer anatomy-diagram-emphasis is-active" data-anatomy-mechanism="${diagram.mechanism}"`);
      expect(html).toContain(diagram.label);
    });
  });

  it('changes cardiac valve state and ventricular geometry with the selected flow phase', () => {
    const filling = renderAnatomy({
      system: 'circulatory', view: 'anterior', complexity: 3, selectedStructure: 'heart',
      _regionalAtlasOpen: 'heart', _regionalAtlasStep: 0
    });
    expect(filling).toContain('data-anatomy-mechanism="heart-valve-gating"');
    expect(filling).toContain('tricuspid · OPEN');
    expect(filling).toContain('mitral · CLOSED');

    const systemic = renderAnatomy({
      system: 'circulatory', view: 'anterior', complexity: 3, selectedStructure: 'heart',
      _regionalAtlasOpen: 'heart', _regionalAtlasStep: 3
    });
    expect(systemic).toContain('data-anatomy-mechanism="left-ventricle-contraction"');
    expect(systemic).toContain('class="anatomy-mechanism-layer anatomy-diagram-emphasis is-active" data-anatomy-mechanism="aortic-valve-open"');
    expect(systemic).toContain('LV contracts · aortic valve opens');
  });
});
describe('Anatomy responsive label focus', () => {
  const focusCases = [
    { id: 'heart', system: 'circulatory', view: 'anterior', step: 0, expected: 'Right atrium, Tricuspid valve, Venae cavae' },
    { id: 'kidneys', system: 'organs', view: 'posterior', step: 1, expected: 'Proximal tubule, Peritubular capillaries, Reabsorbed solutes' },
    { id: 'alveoli', system: 'respiratory', view: 'anterior', step: 2, expected: 'Capillary blood, Carbon dioxide, Alveolar air' },
    { id: 'patella', system: 'skeletal', view: 'anterior', step: 3, expected: 'ACL, PCL, Collateral ligament' },
    { id: 'biceps', system: 'muscular', view: 'anterior', step: 3, expected: 'Actin, Myosin, Z discs' },
    { id: 'liver', system: 'organs', view: 'anterior', step: 3, expected: 'Bile canaliculi, Bile duct branch, Counterflow' },
    { id: 'sm_intestine', system: 'organs', view: 'anterior', step: 2, expected: 'Chylomicrons, Central lacteal, Lymph' },
    { id: 'epidermis', system: 'integumentary', view: 'anterior', step: 2, expected: 'Keratinocytes, New vessels, Granulation tissue' }
  ];

  it('keeps the three most relevant structures readable for every selected step', () => {
    focusCases.forEach((diagram) => {
      const html = renderAnatomy({
        system: diagram.system, view: diagram.view, complexity: 3, selectedStructure: diagram.id,
        _regionalAtlasOpen: diagram.id, _regionalAtlasStep: diagram.step
      });
      expect(html).toContain(`data-anatomy-step-focus="${diagram.id}"`);
      expect(html).toContain(`aria-label="Current structures: ${diagram.expected}"`);
      expect(html).toContain('Current structures');
    });
  });

  it('classifies small SVG annotations as secondary while preserving active mechanism labels on phones', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys',
      _regionalAtlasOpen: 'kidneys', _regionalAtlasStep: 1
    });
    expect(html).toContain('class="anatomy-label-secondary"');
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('.anatomy-label-secondary{display:none}');
    expect(source).toContain('.anatomy-mechanism-layer.is-active .anatomy-label-secondary{display:inline}');
    expect(source).toContain('className: atlasLabelClass(labelOptions, 10)');
  });
});
describe('Anatomy Clinical Lens', () => {
  const clinicalCases = [
    { id: 'heart', system: 'circulatory', view: 'anterior', clinicalId: 'aortic_stenosis', title: 'Aortic stenosis', visual: 'narrow aortic opening · higher LV load' },
    { id: 'kidneys', system: 'organs', view: 'posterior', clinicalId: 'glomerular_barrier_injury', title: 'Glomerular barrier injury', visual: 'protein crosses an injured filter' },
    { id: 'alveoli', system: 'respiratory', view: 'anterior', clinicalId: 'pulmonary_edema', title: 'Pulmonary edema', visual: 'fluid thickens the diffusion path' },
    { id: 'patella', system: 'skeletal', view: 'anterior', clinicalId: 'acl_tear', title: 'ACL tear', visual: 'ACL discontinuity · less restraint' },
    { id: 'biceps', system: 'muscular', view: 'anterior', clinicalId: 'myasthenia_gravis', title: 'Myasthenia gravis', visual: 'fewer functional ACh receptors' },
    { id: 'liver', system: 'organs', view: 'anterior', clinicalId: 'hepatic_fibrosis', title: 'Hepatic fibrosis', visual: 'fibrotic bands distort sinusoidal flow' },
    { id: 'sm_intestine', system: 'organs', view: 'anterior', clinicalId: 'villous_atrophy', title: 'Villous atrophy', visual: 'shortened villi · less surface area' },
    { id: 'epidermis', system: 'integumentary', view: 'anterior', clinicalId: 'impaired_wound_healing', title: 'Impaired wound healing', visual: 'delayed closure · poor perfusion' }
  ];

  it('keeps normal anatomy as the default and exposes an accessible optional control', () => {
    clinicalCases.forEach((diagram) => {
      const html = renderAnatomy({
        system: diagram.system, view: diagram.view, complexity: 3, selectedStructure: diagram.id,
        _regionalAtlasOpen: diagram.id
      });
      expect(html).toContain(`data-anatomy-clinical-toggle="${diagram.id}"`);
      expect(html).toContain(`aria-label="Show ${diagram.title} clinical overlay"`);
      expect(html).not.toContain(`data-anatomy-clinical-panel="${diagram.clinicalId}"`);
      expect(html).not.toContain(`data-anatomy-clinical-overlay="${diagram.clinicalId}"`);
    });
  });

  it('changes every diagram and pairs the visible pathology with a functional consequence', () => {
    clinicalCases.forEach((diagram) => {
      const html = renderAnatomy({
        system: diagram.system, view: diagram.view, complexity: 3, selectedStructure: diagram.id,
        _regionalAtlasOpen: diagram.id, _regionalAtlasClinical: true
      });
      expect(html).toContain('class="anatomy-atlas is-clinical"');
      expect(html).toContain(`data-anatomy-clinical="${diagram.clinicalId}"`);
      expect(html).toContain(`aria-label="Hide ${diagram.title} clinical overlay"`);
      expect(html).toContain(`data-anatomy-clinical-panel="${diagram.clinicalId}"`);
      expect(html).toContain(`data-anatomy-clinical-overlay="${diagram.clinicalId}"`);
      expect(html).toContain(diagram.visual);
      expect(html).toContain('Functional consequence');
      expect(html).toContain('Educational comparison only — not a diagnostic view.');
    });
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("upd('_regionalAtlasClinical', !regionalAtlasClinical)");
  });
});
describe('Anatomy Connected Pathways', () => {
  const pathwayCases = [
    { id: 'heart', system: 'circulatory', view: 'anterior', target: 'alveoli', label: 'Heart to alveoli', button: 'Follow gas exchange' },
    { id: 'kidneys', system: 'organs', view: 'posterior', target: 'heart', label: 'Kidneys to heart', button: 'Connect cardiac output' },
    { id: 'alveoli', system: 'respiratory', view: 'anterior', target: 'heart', label: 'Alveoli to heart', button: 'Return to cardiac flow' },
    { id: 'patella', system: 'skeletal', view: 'anterior', target: 'biceps', label: 'Knee to muscle', button: 'Trace muscle force' },
    { id: 'biceps', system: 'muscular', view: 'anterior', target: 'patella', label: 'Muscle to knee', button: 'Apply force at a joint' },
    { id: 'liver', system: 'organs', view: 'anterior', target: 'sm_intestine', label: 'Liver to intestinal villus', button: 'Trace nutrient absorption' },
    { id: 'sm_intestine', system: 'organs', view: 'anterior', target: 'liver', label: 'Intestinal villus to liver', button: 'Continue to liver processing' },
    { id: 'epidermis', system: 'integumentary', view: 'anterior', target: 'heart', label: 'Skin to heart', button: 'Trace repair perfusion' }
  ];

  it('gives every focused diagram a meaningful next-system handoff', () => {
    pathwayCases.forEach((diagram) => {
      const html = renderAnatomy({
        system: diagram.system, view: diagram.view, complexity: 3, selectedStructure: diagram.id,
        _regionalAtlasOpen: diagram.id
      });
      expect(html).toContain(`data-anatomy-pathway-from="${diagram.id}"`);
      expect(html).toContain(`data-scale-continuation="${diagram.target}"`);
      expect(html).toContain(`aria-label="Connected pathway: ${diagram.label}"`);
      expect(html).toContain(diagram.button);
    });
  });

  it('routes handoffs through the shared scale-bridge navigator with a selected target step', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('function renderAtlasPathwayHandoff(atlasId)');
    expect(source).toContain('openAnatomyScaleBridge(handoff.targetId, handoff.targetStep, handoff.announcement)');
    expect(source).toContain('var ATLAS_PATHWAY_TONES = {');
  });
});
describe('Anatomy Systems in Motion', () => {
  it('offers the exercise scenario without crowding the default anatomy workspace', () => {
    const html = renderAnatomy({ system: 'muscular', view: 'anterior', complexity: 3 });
    expect(html).toContain('Systems in Motion');
    expect(html).toContain('aria-controls="anatomy-systems-motion"');
    expect(html).not.toContain('data-systems-motion="exercise-response"');
  });

  it('coordinates muscle, joint, cardiac, and alveolar diagrams in one accessible pathway', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _regionalAtlasStep: 3, _showSystemsMotion: true
    });
    expect(html).toContain('data-systems-motion="exercise-response"');
    expect(html).toContain('aria-label="Exercise response pathway"');
    expect(html).toContain('data-systems-motion-node="muscle-force"');
    expect(html).toContain('data-systems-motion-node="joint-motion"');
    expect(html).toContain('data-systems-motion-node="cardiac-delivery"');
    expect(html).toContain('data-systems-motion-node="gas-exchange"');
    expect(html).toContain('The matching deep-dive diagram is open below at the relevant mechanism step.');
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    const scenarioSource = source.slice(source.indexOf('var SYSTEMS_IN_MOTION_SCENARIOS'), source.indexOf('var ANATOMY_LENS_ITEMS'));
    expect(scenarioSource).not.toContain("structureId: 'brain'");
  });

  it('shows explanatory checkpoint feedback and unlocks scenario progression', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _regionalAtlasStep: 3, _showSystemsMotion: true,
      _systemsMotionStep: 0, _systemsMotionAnswer: 1, _systemsMotionCompleted: { 'muscle-force': true }
    });
    expect(html).toContain('data-systems-motion-answer="correct"');
    expect(html).toContain('1/4 checkpoints solved');
    expect(html).toContain('Correct — Cross-bridge cycling pulls actin past myosin');
    expect(html).toContain('Next system');
    expect(html).toContain('data-complete="true"');
  });
  it('selects the After a Meal scenario and exposes its four-stage nutrient route', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'liver',
      _regionalAtlasOpen: 'liver', _regionalAtlasStep: 1, _showSystemsMotion: true,
      _systemsMotionScenario: 'meal', _systemsMotionStep: 2
    });
    expect(html).toContain('data-systems-motion="after-meal"');
    expect(html).toContain('data-systems-motion-scenario="meal"');
    expect(html).toContain('aria-label="After a meal nutrient pathway"');
    expect(html).toContain('After a meal: absorption to delivery');
    expect(html).toContain('data-systems-motion-node="meal-absorption"');
    expect(html).toContain('data-systems-motion-node="meal-portal"');
    expect(html).toContain('data-systems-motion-node="meal-processing"');
    expect(html).toContain('data-systems-motion-node="meal-delivery"');
    expect(html).toContain('Process the meal');
  });

  it('keeps checkpoint progress scoped to the selected scenario', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'sm_intestine',
      _regionalAtlasOpen: 'sm_intestine', _regionalAtlasStep: 1, _showSystemsMotion: true,
      _systemsMotionScenario: 'meal', _systemsMotionStep: 0, _systemsMotionAnswer: 0,
      _systemsMotionCompleted: { 'muscle-force': true, 'meal-absorption': true }
    });
    expect(html).toContain('data-systems-motion-choice="exercise"');
    expect(html).toContain('data-systems-motion-choice="meal"');
    expect(html).toContain('aria-pressed="true" data-systems-motion-choice="meal"');
    expect(html).toContain('1/4 checkpoints solved');
    expect(html).not.toContain('2/4 checkpoints solved');
    expect(html).toContain('Water-soluble nutrients enter villus capillaries');
  });
  it('coordinates perfusion, hemostasis, inflammation, and skin rebuilding', () => {
    const html = renderAnatomy({
      system: 'integumentary', view: 'anterior', complexity: 3, selectedStructure: 'epidermis',
      _regionalAtlasOpen: 'epidermis', _regionalAtlasStep: 2, _showSystemsMotion: true,
      _systemsMotionScenario: 'wound', _systemsMotionStep: 3
    });
    expect(html).toContain('data-systems-motion="wound-repair"');
    expect(html).toContain('data-systems-motion-scenario="wound"');
    expect(html).toContain('aria-label="Wound repair response pathway"');
    expect(html).toContain('Wound repair: perfusion to rebuilding');
    expect(html).toContain('data-systems-motion-node="wound-perfusion"');
    expect(html).toContain('data-systems-motion-node="wound-hemostasis"');
    expect(html).toContain('data-systems-motion-node="wound-inflammation"');
    expect(html).toContain('data-systems-motion-node="wound-rebuilding"');
    expect(html).toContain('Rebuild the barrier');
  });

  it('summarizes independent completion on every scenario choice', () => {
    const html = renderAnatomy({
      system: 'integumentary', view: 'anterior', complexity: 3, selectedStructure: 'epidermis',
      _regionalAtlasOpen: 'epidermis', _showSystemsMotion: true, _systemsMotionScenario: 'wound',
      _systemsMotionCompleted: {
        'muscle-force': true, 'joint-motion': true,
        'meal-absorption': true,
        'wound-perfusion': true, 'wound-hemostasis': true, 'wound-inflammation': true
      }
    });
    expect(html).toContain('data-systems-motion-choice="exercise" data-systems-motion-choice-progress="2/4"');
    expect(html).toContain('data-systems-motion-choice="meal" data-systems-motion-choice-progress="1/4"');
    expect(html).toContain('data-systems-motion-choice="wound" data-systems-motion-choice-progress="3/4"');
    expect(html).toContain('aria-label="Wound repair, 3 of 4 checkpoints solved"');
    expect(html).toContain('3/4 solved');
  });
  it('renders a trigger-to-mechanism-to-outcome diagram for the selected stage', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true, _systemsMotionScenario: 'exercise'
    });
    expect(html).toContain('class="anatomy-motion-cascade" role="img"');
    expect(html).toContain('Trigger');
    expect(html).toContain('Acetylcholine starts a muscle-fiber action potential.');
    expect(html).toContain('Calcium exposes actin sites so myosin cross-bridges cycle.');
    expect(html).toContain('Sarcomeres shorten and tendon tension rises.');
    expect(html).toContain('Show deeper physiology');
    expect(html).not.toContain('data-systems-motion-advanced="muscle-force"');
  });

  it('provides stage-specific advanced physiology across every scenario', () => {
    const depthCases = [
      { scenario: 'exercise', step: 2, system: 'circulatory', structure: 'heart', advancedId: 'cardiac-delivery', text: 'Cardiac output equals heart rate × stroke volume' },
      { scenario: 'meal', step: 2, system: 'organs', structure: 'liver', advancedId: 'meal-processing', text: 'Insulin favors hepatic glucose uptake and glycogen synthesis' },
      { scenario: 'wound', step: 1, system: 'integumentary', structure: 'epidermis', advancedId: 'wound-hemostasis', text: 'Platelet adhesion and activation amplify recruitment' }
    ];
    depthCases.forEach((scenario) => {
      const html = renderAnatomy({
        system: scenario.system, view: 'anterior', complexity: 3, selectedStructure: scenario.structure,
        _regionalAtlasOpen: scenario.structure, _showSystemsMotion: true,
        _systemsMotionScenario: scenario.scenario, _systemsMotionStep: scenario.step, _systemsMotionDeepDive: true
      });
      expect(html).toContain('data-systems-motion-depth="advanced"');
      expect(html).toContain(`data-systems-motion-advanced="${scenario.advancedId}"`);
      expect(html).toContain('Hide deeper physiology');
      expect(html).toContain(scenario.text);
    });
  });

  it('uses scenario-specific visual identity and marks completed causal transitions', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'anterior', complexity: 3, selectedStructure: 'sm_intestine',
      _regionalAtlasOpen: 'sm_intestine', _showSystemsMotion: true, _systemsMotionScenario: 'meal',
      _systemsMotionCompleted: { 'meal-absorption': true }
    });
    expect(html).toContain('style="--motion-accent:#c2410c;--motion-soft:#fff7ed"');
    expect(html).toContain('class="anatomy-motion-symbol" aria-hidden="true">Glc</span>');
    expect(html).toContain('class="anatomy-motion-arrow" aria-hidden="true" data-complete="true"');
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('.anatomy-motion-cascade{display:grid');
    expect(source).toContain('.anatomy-motion-arrow[data-complete="true"]');
    expect(source).toContain('@media (max-width:560px)');
  });
  it('keeps typical physiology as the default scenario state', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true
    });
    expect(html).toContain('data-systems-motion-perturbation="typical"');
    expect(html).toContain('What if physiology is disrupted?');
    expect(html).toContain('Apply disruption');
    expect(html).not.toContain('class="anatomy-motion-impact"');
    expect(html).not.toContain('is-perturbed');
  });

  it('shows a scenario-specific impact chain at each clinical bottleneck', () => {
    const disruptionCases = [
      { scenario: 'exercise', step: 3, system: 'respiratory', structure: 'alveoli', atlasStep: 1, impact: 'pulmonary-edema', clinical: 'pulmonary_edema', title: 'Pulmonary edema', effect: 'Oxygen diffusion falls despite continued ventilation.' },
      { scenario: 'meal', step: 0, system: 'organs', structure: 'sm_intestine', atlasStep: 1, impact: 'villous-atrophy', clinical: 'villous_atrophy', title: 'Villous atrophy', effect: 'Fewer nutrients, electrolytes, and water cross efficiently.' },
      { scenario: 'wound', step: 3, system: 'integumentary', structure: 'epidermis', atlasStep: 2, impact: 'impaired-healing', clinical: 'impaired_wound_healing', title: 'Impaired wound healing', effect: 'Keratinocyte migration, angiogenesis, and matrix deposition slow.' }
    ];
    disruptionCases.forEach((scenario) => {
      const html = renderAnatomy({
        system: scenario.system, view: 'anterior', complexity: 3, selectedStructure: scenario.structure,
        _regionalAtlasOpen: scenario.structure, _regionalAtlasStep: scenario.atlasStep, _regionalAtlasClinical: true,
        _showSystemsMotion: true, _systemsMotionScenario: scenario.scenario,
        _systemsMotionStep: scenario.step, _systemsMotionPerturbation: true
      });
      expect(html).toContain('class="anatomy-motion mb-3 is-perturbed"');
      expect(html).toContain(`data-systems-motion-perturbation="${scenario.impact}"`);
      expect(html).toContain(`data-systems-motion-impact="${scenario.impact}"`);
      expect(html).toContain(`${scenario.title} impact chain`);
      expect(html).toContain(scenario.effect);
      expect(html).toContain('Structural change');
      expect(html).toContain('Local effect');
      expect(html).toContain('Pathway consequence');
      expect(html).toContain(`data-anatomy-clinical="${scenario.clinical}"`);
      expect(html).toContain('Restore typical physiology');
    });
  });

  it('synchronizes the selected disruption point with the matching Clinical Lens', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain('function toggleSystemsMotionPerturbation()');
    expect(source).toContain('_regionalAtlasClinical: systemsMotionPerturbation && motionStep.id === requestedScenario.perturbation.affectedStepId');
    expect(source).toContain("'data-disruption-point': stepItem.id === systemsMotionScenario.perturbation.affectedStepId ? 'true' : 'false'");
    expect(source).toContain('.anatomy-motion-node[data-disruption-point="true"]');
    expect(source).toContain('.anatomy-motion-impact{display:grid');
  });
  it('connects cardiac delivery to filtration, reabsorption, and urine concentration', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys',
      _regionalAtlasOpen: 'kidneys', _regionalAtlasStep: 1, _showSystemsMotion: true,
      _systemsMotionScenario: 'fluid', _systemsMotionStep: 2, _systemsMotionDeepDive: true
    });
    expect(html).toContain('data-systems-motion="fluid-balance"');
    expect(html).toContain('data-systems-motion-scenario="fluid"');
    expect(html).toContain('aria-label="Fluid balance regulation pathway"');
    expect(html).toContain('data-systems-motion-choice="fluid"');
    expect(html).toContain('data-systems-motion-node="renal-perfusion"');
    expect(html).toContain('data-systems-motion-node="renal-filtration"');
    expect(html).toContain('data-systems-motion-node="renal-reabsorption"');
    expect(html).toContain('data-systems-motion-node="renal-concentration"');
    expect(html).toContain('Selective transport returns sodium, glucose, amino acids, bicarbonate, and water');
    expect(html).toContain('The proximal tubule performs bulk reabsorption');
    expect(html).toContain('data-systems-motion-advanced="renal-reabsorption"');
  });

  it('links glomerular barrier disruption to the kidney Clinical Lens', () => {
    const html = renderAnatomy({
      system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys',
      _regionalAtlasOpen: 'kidneys', _regionalAtlasStep: 0, _regionalAtlasClinical: true,
      _showSystemsMotion: true, _systemsMotionScenario: 'fluid', _systemsMotionStep: 1,
      _systemsMotionPerturbation: true, _systemsMotionCompleted: { 'renal-perfusion': true }
    });
    expect(html).toContain('data-systems-motion-perturbation="glomerular-barrier-injury"');
    expect(html).toContain('data-systems-motion-impact="glomerular-barrier-injury"');
    expect(html).toContain('Glomerular barrier injury impact chain');
    expect(html).toContain('Protein enters Bowman space and the tubular filtrate.');
    expect(html).toContain('data-anatomy-clinical="glomerular_barrier_injury"');
    expect(html).toContain('data-anatomy-clinical-overlay="glomerular_barrier_injury"');
    expect(html).toContain('data-systems-motion-choice="fluid" data-systems-motion-choice-progress="1/4"');
  });
  it('unlocks Systems Synthesis only after all checkpoints are solved', () => {
    const incomplete = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true, _systemsMotionScenario: 'exercise',
      _systemsMotionCompleted: { 'muscle-force': true }, _showSystemsSynthesis: true
    });
    expect(incomplete).not.toContain('data-systems-synthesis="exercise-response"');
    expect(incomplete).not.toContain('View synthesis');

    const complete = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true, _systemsMotionScenario: 'exercise',
      _systemsMotionCompleted: { 'muscle-force': true, 'joint-motion': true, 'cardiac-delivery': true, 'gas-exchange': true },
      _showSystemsSynthesis: true
    });
    expect(complete).toContain('data-systems-synthesis="exercise-response"');
    expect(complete).toContain('Systems Synthesis');
    expect(complete).toContain('data-synthesis-step="muscle-force"');
    expect(complete).toContain('Typical physiology');
    expect(complete).toContain('Pulmonary edema');
    expect(complete).toContain('Integrated takeaway:');
    expect(complete).toContain('aria-label="Review Generate force: Sarcomeres shorten and tendon tension rises."');
    expect(complete).toContain('Hide synthesis');
  });

  it('summarizes every scenario with its own causal takeaway and disruption comparison', () => {
    const cases = [
      { scenario: 'meal', system: 'organs', view: 'anterior', structure: 'liver', expected: 'Absorption is not the end of digestion' },
      { scenario: 'wound', system: 'integumentary', view: 'anterior', structure: 'epidermis', expected: 'A wound is a systems problem' },
      { scenario: 'fluid', system: 'organs', view: 'posterior', structure: 'kidneys', expected: 'Kidneys regulate the internal environment' }
    ];
    cases.forEach((scenario) => {
      const steps = scenario.scenario === 'meal'
        ? { 'meal-absorption': true, 'meal-portal': true, 'meal-processing': true, 'meal-delivery': true }
        : scenario.scenario === 'wound'
          ? { 'wound-perfusion': true, 'wound-hemostasis': true, 'wound-inflammation': true, 'wound-rebuilding': true }
          : { 'renal-perfusion': true, 'renal-filtration': true, 'renal-reabsorption': true, 'renal-concentration': true };
      const html = renderAnatomy({
        system: scenario.system, view: scenario.view, complexity: 3, selectedStructure: scenario.structure,
        _regionalAtlasOpen: scenario.structure, _showSystemsMotion: true, _systemsMotionScenario: scenario.scenario,
        _systemsMotionCompleted: steps, _showSystemsSynthesis: true
      });
      expect(html).toContain('data-systems-synthesis');
      expect(html).toContain('Typical physiology');
      expect(html).toContain('Integrated takeaway:');
      expect(html).toContain(scenario.expected);
    });
  });

  it('offers a persisted comfortable-reading mode for dense anatomy explanations', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    const standard = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3 });
    const comfort = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3, _readingMode: true });
    expect(source).toContain('function toggleReadingMode()');
    expect(source).toContain('[data-reading-mode=true]');
    expect(standard).toContain('data-reading-mode=');
    expect(standard).toContain('Enable comfortable reading mode');
    expect(comfort).toContain('Comfort text on');
    expect(comfort).toContain('Disable comfortable reading mode');
  });

  it('provides a current-layer isolation shortcut without removing layer toggles', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    const html = renderAnatomy({ system: 'circulatory', view: 'anterior', complexity: 3 });
    expect(source).toContain('var isolateLayer = function(lid)');
    expect(source).toContain('data-anatomy-layer-isolate');
    expect(html).toContain('data-anatomy-layer-isolate');
    expect(html).toContain('Show only Circulatory layer');
    expect(html).toContain('Hide Circulatory layer');
  });

  it('makes the 3D anatomy overview keyboard-operable for rotation, zoom, and marker cycling', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    const html = renderAnatomy({ system: 'organs', view: 'anterior', complexity: 3, _bodyView3d: true });
    expect(source).toContain('canvas._anatomy3dKeyControl');
    expect(source).toContain('markerItems');
    expect(source).toContain('function adjustCameraDistance(delta)');
    expect(source).toContain('camera.position.copy(cameraTarget).add(cameraOffset.setLength(nextDistance))');
    expect(html).toContain('data-anatomy-view');
    expect(html).toContain('ArrowUp ArrowDown ArrowLeft ArrowRight + - [ ] R Home 0');
    expect(html).toContain('square brackets to cycle labeled markers');
  });


  it('turns an incorrect Systems in Motion answer into a targeted mechanism hint', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true, _systemsMotionScenario: 'exercise',
      _systemsMotionStep: 0, _systemsMotionAnswer: 0
    });
    expect(html).toContain('data-systems-motion-answer=');
    expect(html).toContain('data-misconception=');
    expect(html).toContain('Selected option: Calcium expands the tendon');
    expect(html).toContain('Re-read the causal chain');
    expect(html).toContain('Show mechanism');
    expect(html).toContain('role=');
  });

  it('keeps a pinned comparison target visible outside the detail panel', () => {
    const html = renderAnatomy({
      system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'skull',
      _compareStructure: 'ribs'
    });
    expect(html).toContain('data-anatomy-compare-tray=');
    expect(html).toContain('Pinned comparison target');
    expect(html).toContain('Comparison target');
    expect(html).toContain('Open comparison target Ribs');
    expect(html).toContain('Clear comparison target Ribs');
  });


  it('turns confidence ratings into a one-click review queue', () => {
    const html = renderAnatomy({
      system: 'skeletal', view: 'anterior', complexity: 3,
      _structureConfidence: { skull: 'practice', ribs: 'learning', clavicle: 'practice', sternum: 'practice' }
    });
    expect(html).toContain('data-anatomy-review-queue');
    expect(html).toContain('Review queue');
    expect(html).toContain('data-review-queue-id="skull"');


    expect(html).toContain('data-review-queue-id="clavicle"');
    expect(html).toContain('+1 more');
  });

  it('does not show an empty review queue', () => {
    const html = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3 });
    expect(html).not.toContain('data-anatomy-review-queue');
  });

  it('builds an accessible structure-centered relationship map', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    const html = renderAnatomy({
      system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'skull'
    });
    expect(source).toContain('function openRelationshipConnection(connection)');
    expect(source).toContain('nextConnectionsViewed[connection.id] = true');
    expect(html).toContain('data-anatomy-relationship-map="skull"');
    expect(html).toContain('role="figure"');
    expect(html).toContain('aria-labelledby="anatomy-relationship-map-skull"');
    expect(html).toContain('data-relationship-connection="conn_3"');
    expect(html).toContain('data-relationship-connection="conn_10"');
    expect(html).toContain('Lever System for Movement');
    expect(html).toContain('Open Muscular system diagram from Lever System for Movement');
    expect(html).toContain('System-context links can involve this structure directly or through the larger skeletal system.');
  });

  it('does not render a relationship map without a selected structure', () => {
    const html = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3 });
    expect(html).not.toContain('data-anatomy-relationship-map');
  });

  it('renders an adaptive whole-body mastery map with an exact priority', () => {
    const html = renderAnatomy({
      system: 'skeletal', view: 'anterior', complexity: 3, _showMasteryMap: true,
      _structuresViewed: { skull: true, ribs: true, biceps: true, quads: true },
      _structureConfidence: { skull: 'mastered', ribs: 'practice', biceps: 'learning', quads: 'practice' }
    });
    expect(html).toContain('data-anatomy-mastery-map="true"');
    expect(html).toContain('Whole-body mastery map');
    expect(html).toContain('data-mastery-priority="muscular"');
    expect(html).toContain('Muscular — 2 structures ready for review');
    expect(html).toContain('data-mastery-system="skeletal"');
    expect(html).toContain('data-mastery-system="muscular"');
    expect(html).toContain('data-mastery-status="review"');
    expect(html).toContain('aria-label="Muscular: 0 got it, 2 to review, 2 viewed of');
    expect(html).toContain('role="group"');
    expect(html).toContain('3 to review');
    expect(html).toContain('Study this system');
  });

  it('keeps the whole-body mastery map behind an accessible disclosure', () => {
    const html = renderAnatomy({ system: 'skeletal', view: 'anterior', complexity: 3 });
    expect(html).toContain('aria-controls="anatomy-mastery-map"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Mastery map');
    expect(html).not.toContain('data-anatomy-mastery-map="true"');
  });

  it('personalizes the Scale Journey from alveoli to the lung cell atlas', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    const html = renderAnatomy({
      system: 'respiratory', view: 'anterior', complexity: 3, selectedStructure: 'alveoli'
    });
    expect(source).toContain('_scaleJourneySystem: sysKey');
    expect(source).toContain('_scaleJourneyStructure: sel ? sel.id : null');
    expect(html).toContain('data-anatomy-scale-journey="alveoli"');
    expect(html).toContain('data-scale-stage="body"');
    expect(html).toContain('data-scale-stage="structure"');
    expect(html).toContain('data-scale-stage="tissue"');
    expect(html).toContain('data-scale-stage="cell"');
    expect(html).toContain('data-scale-specialist="anatomyLens"');
    expect(html).toContain('Alveolus and gas-exchange deep dive');
    expect(html).toContain('data-scale-cell-context="lung"');
    expect(html).toContain('Open cell level: Lung Cell Atlas');
    expect(html).toContain('Current route: Respiratory → Alveoli → Alveolus and gas-exchange deep dive → Lung Cell Atlas.');
  });

  it('hands brain structures to the dedicated brain and cell atlases', () => {
    const html = renderAnatomy({
      system: 'nervous', view: 'anterior', complexity: 3, selectedStructure: 'brain'
    });
    expect(html).toContain('data-anatomy-scale-journey="brain"');
    expect(html).toContain('data-scale-specialist="brainAtlas"');
    expect(html).toContain('Open tissue or specialist level: Brain Atlas');
    expect(html).toContain('data-scale-cell-context="brain"');
    expect(html).toContain('Open cell level: Brain Cell Atlas');
    expect(html).toContain('Current route: Nervous → Brain → Brain Atlas → Brain Cell Atlas.');
  });
  it('adds a branching intervention lab to disrupted physiology', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true, _systemsMotionScenario: 'exercise',
      _systemsMotionPerturbation: true
    });

    expect(html).toContain('data-systems-intervention="exercise"');
    expect(html).toContain('Branch decision');
    expect(html).toContain('Respond to the oxygen-delivery bottleneck');
    expect(html).toContain('data-intervention-choice="exercise-support-exchange"');
    expect(html).toContain('data-intervention-choice="exercise-increase-load"');
    expect(html).toContain('Instructional physiology scenario');
    expect(html).not.toContain('data-intervention-result=');
  });

  it('renders a correct intervention as a causal response pathway', () => {
    const html = renderAnatomy({
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true, _systemsMotionScenario: 'exercise',
      _systemsMotionPerturbation: true,
      _systemsMotionInterventions: { exercise: 'exercise-support-exchange' }
    });

    expect(html).toContain('data-intervention-path="exercise-support-exchange"');
    expect(html).toContain('data-intervention-result="correct"');
    expect(html).toContain('Mechanism matched');
    expect(html).toContain('Lower demand and improved alveolar-capillary transfer');
    expect(html).toContain('More usable oxygen can reach working muscle');
    expect(html).toContain('1/4 response decisions solved');
  });

  it('guides a wrong branch back to the disrupted mechanism and rejects forged choices', () => {
    const base = {
      system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _showSystemsMotion: true, _systemsMotionScenario: 'exercise',
      _systemsMotionPerturbation: true
    };
    const wrong = renderAnatomy({
      ...base,
      _systemsMotionInterventions: { exercise: 'exercise-increase-load' }
    });
    const forged = renderAnatomy({
      ...base,
      _systemsMotionInterventions: { exercise: 'forged', forged: 'exercise-support-exchange' }
    });

    expect(wrong).toContain('data-intervention-result="reconsider"');
    expect(wrong).toContain('Reconsider the bottleneck');
    expect(wrong).toContain('Review disruption point');
    expect(forged).not.toContain('data-intervention-result=');
    expect(fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8')).toContain('safeEnumMap(d._systemsMotionInterventions, systemsMotionScenarioIds, systemsMotionInterventionOptionIds)');
  });
});
