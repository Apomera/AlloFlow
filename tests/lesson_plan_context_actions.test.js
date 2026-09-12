import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function callbackSource(start, end) {
  const first = source.indexOf('  const ' + start + ' =');
  const last = source.indexOf('  const ' + end + ' =', first);
  if (first < 0 || last < 0) throw new Error('Missing lesson action boundary');
  return source.slice(first, last);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const lesson = () => ({ id: 'plan-a', type: 'lesson-plan', title: 'Saved fractions lesson', config: { gradeLevel: '4th Grade', sourceArtifactId: 'source-a', standardsContext: { code: '4.NF.A.1', label: 'Equivalent fractions' } }, data: { objectives: ['Explain equivalent fractions'], essentialQuestion: 'Why are two fourths and one half equivalent?', directInstruction: 'Model equal intervals on a number line.', extensions: [{ title: 'Make fraction strips', description: 'Fold strips into equal lengths.' }] } });
const sourceMaterial = () => ({ id: 'source-a', type: 'analysis', data: { originalText: 'SOURCE FRACTIONS: Equal intervals represent equal quantities.' } });
const unrelated = () => ({ id: 'source-z', type: 'analysis', data: { originalText: 'UNRELATED DINOSAUR SOURCE' } });
const options = () => ['Linear', 'Deep Dive', 'Remediation'].map(type => ({ nextTopic: type + ' fraction lesson', rationale: 'Build on equivalent fractions.', focus: 'Compare quantities', type }));
function harness(saved = lesson(), active = saved) {
  const state = { history: [saved, sourceMaterial(), unrelated()], generatedContent: active, activeView: 'lesson-plan', progression: null, busy: false };
  const refs = [], effects = [];
  let hookIndex = 0, effectIndex = 0;
  const pending = [];
  const callGemini = vi.fn(() => { const wait = deferred(); pending.push(wait); return wait.promise; });
  const setters = Object.fromEntries(['setGradeLevel', 'setSourceLevel', 'setStandardsInput', 'setTargetStandards', 'setSourceTopic', 'setSourceCustomInstructions', 'setShowSourceGen', 'setExpandedTools', 'setGeneratedContent', 'setMbJoinError', 'setMbJoinRetryable', 'setMbJoinStatus', 'setActiveView', 'setInputText', 'setShowUDLGuide', 'setUdlMessages', 'setGuidedFlowState'].map(name => [name, vi.fn()]));
  const scope = {
    ...setters, _resourceMutationStateRef: { current: state }, callGemini, cleanJson: value => value,
    addToast: vi.fn(), warnLog: vi.fn(), t: key => key,
    setProgressionData: vi.fn(value => { state.progression = value; }), setIsGeneratingProgression: vi.fn(value => { state.busy = value; }),
    useRef: value => refs[hookIndex++] ||= { current: value },
    useEffect: (effect, dependencies) => { const index = effectIndex++; if (JSON.stringify(effects[index]) !== JSON.stringify(dependencies)) { effects[index] = dependencies; effect(); } }
  };
  const code = callbackSource('handleGenerateProgression', 'generateHelpfulHint');
  const render = () => {
    hookIndex = effectIndex = 0;
    const current = { ...scope, activeView: state.activeView };
    return new Function(...Object.keys(current), code + '\nreturn { generate: handleGenerateProgression, activate: handleActivateNextLesson };')(...Object.values(current));
  };
  return { state, scope, pending, callGemini, render, setters };
}

describe('saved lesson follow-up context', () => {
  it('uses canonical lesson content, grade, standards and its linked source instead of workspace context', async () => {
    const saved = lesson(), stale = { ...saved, config: { gradeLevel: '12th Grade' }, data: { directInstruction: 'STALE ACTIVE PLAN' } };
    const h = harness(saved, stale), actions = h.render(), run = actions.generate();
    const prompt = h.callGemini.mock.calls[0][0];
    expect(prompt).toContain('Saved fractions lesson'); expect(prompt).toContain('4th Grade');
    expect(prompt).toContain('4.NF.A.1 Equivalent fractions'); expect(prompt).toContain('Model equal intervals');
    expect(prompt).toContain('SOURCE FRACTIONS'); expect(prompt).not.toContain('UNRELATED DINOSAUR');
    expect(prompt).not.toContain('12th Grade'); expect(prompt).not.toContain('STALE ACTIVE PLAN');
    h.pending[0].resolve(JSON.stringify(options())); await run;
    expect(h.state.progression).toHaveLength(3); expect(h.state.busy).toBe(false);
    actions.activate(h.state.progression[0]);
    const instructions = h.setters.setSourceCustomInstructions.mock.calls[0][0];
    expect(instructions).toContain('Prior grade: 4th Grade'); expect(instructions).toContain('4.NF.A.1');
    expect(instructions).toContain('Model equal intervals'); expect(instructions).toContain('SOURCE FRACTIONS');
    expect(instructions).not.toContain('UNRELATED DINOSAUR');
    expect(h.setters.setGradeLevel).toHaveBeenCalledWith('4th Grade'); expect(h.setters.setSourceLevel).toHaveBeenCalledWith('4th Grade');
    expect(h.setters.setStandardsInput).toHaveBeenCalledWith('4.NF.A.1 Equivalent fractions'); expect(h.setters.setTargetStandards).toHaveBeenCalledWith(['4.NF.A.1 Equivalent fractions']);
  });
  it('does not substitute unrelated sources or an invented grade for an older plan', async () => {
    const saved = { ...lesson(), config: {} }, h = harness(saved), actions = h.render(), run = actions.generate();
    const prompt = h.callGemini.mock.calls[0][0];
    expect(prompt).toContain('"grade":""'); expect(prompt).toContain('"standards":""'); expect(prompt).toContain('"sourceText":""');
    expect(prompt).not.toContain('SOURCE FRACTIONS'); expect(prompt).not.toContain('UNRELATED DINOSAUR');
    h.pending[0].resolve(JSON.stringify(options())); await run;
    expect(h.state.progression).toHaveLength(3);
  });
  it('discards late options after navigation, lesson edits, source edits or deletion', async () => {
    const changes = [
      state => { state.generatedContent = { id: 'other', type: 'quiz', data: {} }; },
      state => { state.activeView = 'input'; },
      state => { state.history[0] = { ...state.history[0], data: { ...state.history[0].data, directInstruction: 'Teacher revised the explanation.' } }; },
      state => { state.history[1] = { ...state.history[1], data: { originalText: 'A new source revision.' } }; },
      state => { state.history = state.history.slice(1); }
    ];
    for (const change of changes) {
      const h = harness(), run = h.render().generate();
      change(h.state); h.render(); h.scope.addToast.mockClear();
      h.pending[0].resolve(JSON.stringify(options())); await run;
      expect(h.state.progression).toBeNull(); expect(h.state.busy).toBe(false); expect(h.scope.addToast).not.toHaveBeenCalled();
    }
  });
  it('preserves a newer request when the previous request resolves later', async () => {
    const h = harness(), actions = h.render(), first = actions.generate(), second = actions.generate();
    const newer = options().map(option => ({ ...option, nextTopic: 'Newest ' + option.nextTopic }));
    h.pending[1].resolve(JSON.stringify(newer)); await second;
    h.pending[0].resolve(JSON.stringify(options())); await first;
    expect(h.state.progression).toEqual(newer); expect(h.scope.addToast).toHaveBeenCalledTimes(1);
  });
  it('allows a generated script to arrive without invalidating next-lesson options', async () => {
    const h = harness(), run = h.render().generate();
    h.state.history[0] = { ...h.state.history[0], data: { ...h.state.history[0].data, teachingScripts: [{ id: 'script-new' }] } };
    h.render(); h.pending[0].resolve(JSON.stringify(options())); await run;
    expect(h.state.progression).toHaveLength(3); expect(h.state.history[0].data.teachingScripts).toEqual([{ id: 'script-new' }]);
  });
  it('rejects activating stale or foreign recommendations', async () => {
    const h = harness(), actions = h.render(), run = actions.generate();
    h.pending[0].resolve(JSON.stringify(options())); await run;
    const selected = h.state.progression[0];
    actions.activate({ ...selected });
    expect(h.setters.setSourceTopic).not.toHaveBeenCalled();
    h.state.history[0] = { ...h.state.history[0], config: { ...h.state.history[0].config, gradeLevel: '6th Grade' } };
    actions.activate(selected);
    expect(h.setters.setSourceTopic).not.toHaveBeenCalled();
  });
});

describe('extension guide saved grade', () => {
  it.each(['4th Grade', { label: 'Adult learners' }])('uses saved config.gradeLevel %j before legacy or workspace grade', async grade => {
    const saved = { ...lesson(), config: { ...lesson().config, gradeLevel: grade } }, h = harness(saved);
    const scope = { ...h.scope, generatedContent: { ...saved, config: { grade: '12' } }, gradeLevel: '11', _extensionGuideRequests: { current: new Map() }, onUpdateResource: vi.fn(() => true), setIsGeneratingExtensionGuide: vi.fn() };
    const run = new Function(...Object.keys(scope), callbackSource('handleGenerateExtensionGuide', 'handleGenerateProgression') + '\nreturn handleGenerateExtensionGuide;')(...Object.values(scope))(0);
    expect(h.callGemini.mock.calls[0][0]).toContain('Target Grade: ' + (typeof grade === 'string' ? grade : grade.label));
    h.pending[0].resolve('Guide'); await run;
  });
});
