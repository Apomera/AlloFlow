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
    expect(source).toContain("length >= 10; }, progress: function(d) { return Object.keys(d._systemsExplored || {}).length + '/10 systems'");
    expect(source).not.toContain("length >= 8; }, progress: function(d) { return Object.keys(d._systemsExplored || {}).length + '/8 systems'");
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
    expect(source).toContain("var activeCaseId = d._activeCaseId || null;");
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
    expect(html).toContain('Use the arrow keys to move through visible structures');
    expect(html).toContain('R/L labels show the patient');

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
    expect(source).toContain("upd('_quizAttempts', (d._quizAttempts || 0) + 1)");
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
    expect(html).toContain('aria-label="Scaphoid Bone, tap to reveal its function"');
  });

  it('resets quiz attempts atomically and clears ended Spotter rounds', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("updMulti({ quizMode: !d.quizMode, quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0 })");
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
    expect(source).toContain('system: key, selectedStructure: null, quizMode: false, quizIdx: 0, quizScore: 0, quizFeedback: null');
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
    expect(html).toContain('Anterior view');
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
    expect(source).toContain("updMulti({ _activeTab: tab, _tourActive: true, _tourStepIdx: 0 })");
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
