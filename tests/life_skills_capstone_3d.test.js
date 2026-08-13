import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = process.cwd();

describe('Life Skills 3D day-in-the-life capstone', () => {
  it('ships an accessible five-station scene and parent bridge', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const publicCopy = readFileSync(resolve(root, 'desktop/web-app/public/life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

    expect(source).toContain('id="capstoneScene"');
    expect(source).toContain("id: 'stove'");
    expect(source).toContain("id: 'visibility'");
    expect(source).toContain('alloflow-life-capstone-3d-task-complete');
    expect(source).toContain('alloflow-life-capstone-3d-complete');
    expect(source).toContain('The 3D scene is unavailable in this browser.');
    expect(source).toContain('id="hintButton"');
    expect(source).toContain('id="challengeButton"');
    expect(source).toContain('id="missionTitle"');
    expect(source).toContain('id="missionContext"');
    expect(source).toContain('id="supportBadge"');
    expect(source).toContain('var MISSION_BY_FOCUS =');
    expect(source).toContain("safety: { title: 'Safe morning launch'");
    expect(source).toContain("transit: { title: 'Safe trip connection'");
    expect(source).toContain('function runTasks() { return state.order.map');
    expect(source).toContain("state.support === 'supported'");
    expect(source).toContain("state.support === 'independent'");
    expect(source).toContain("panel.setAttribute('data-risk-active'");
    expect(source).toContain("panel.setAttribute('data-mission-complete'");
    expect(source).toContain('missionFocus: state.missionFocus');
    expect(source).toContain('id="transferSummary"');
    expect(source).toContain('id="evidenceBar"');
    expect(source).toContain('function evidenceCounts()');
    expect(source).toContain('var CONTEXTS =');
    expect(source).toContain('id="contextBadge"');
    expect(source).toContain('id="contextTransferSummary"');
    expect(source).toContain('function contextTransferCount()');
    expect(source).toContain("panel.setAttribute('data-context-shift'");
    expect(source).toContain('contextTransfer: contextTransferCount()');
    expect(source).toContain('var PROCEDURES =');
    expect(source).toContain('id="procedureButton"');
    expect(source).toContain('id="procedureProgress"');
    expect(source).toContain('id="actionSequence3d"');
    expect(source).toContain("AFRAME.registerComponent('capstone-action'");
    expect(source).toContain('id="actionConsole3d"');
    expect(source).toContain('capstone-action="slot: 0"');
    expect(source).toContain('cursor="rayOrigin: mouse; fuse: false"');
    expect(source).toContain('laser-controls="hand: left"');
    expect(source).toContain('id="procedure-risk-shutoff"');
    expect(source).toContain('function renderProcedureEffects(focusId)');
    expect(source).toContain('id="procedurePracticeSummary"');
    expect(source).toContain('function beginProcedure(station)');
    expect(source).toContain('function chooseProcedure(actionId, inputSlot)');
    expect(source).toContain('function chooseProcedureSlot(slot)');
    expect(source).toContain('alloflow-life-capstone-3d-procedure-start');
    expect(source).toContain('alloflow-life-capstone-3d-procedure-practiced');
    expect(source).toContain("panel.setAttribute('data-action-practice'");
    expect(source).toContain('procedurePractice: procedurePracticeCount()');
    expect(source).toContain('function recordOutcome(task)');
    expect(source).toContain('function recommendedTask()');
    expect(source).toContain('function beginTargetedReplay(station)');
    expect(source).toContain('function finishTargetedReplay(task)');
    expect(source).toContain('alloflow-life-capstone-3d-targeted-replay-start');
    expect(source).toContain('alloflow-life-capstone-3d-replay-complete');
    expect(source).toContain("state.support === 'supported' ? 'guided' : 'independent'");
    expect(source).toContain("'self-corrected'");
    expect(source).toContain('recommendedTask: target ? target.id');
    expect(source).toContain('function beginChallenge()');
    expect(source).toContain('alloflow-life-capstone-3d-challenge-start');
    expect(source).toContain('Safe-answer styling is intentionally hidden.');
    expect(source).toContain('id="state-stove"');
    expect(source).toContain('id="state-visibility"');
    expect(source).toContain('RISK STILL ACTIVE');
    expect(source).toContain('state.risk[task.id] = true');
    expect(source).toContain('state.focused = runTasks()[state.activeIndex].id');
    expect(source).toContain('id="debrief"');
    expect(source).toContain('data-confidence="ready"');
    expect(source).toContain('alloflow-life-capstone-3d-debrief');
    expect(source).toContain('id="teachBackInput"');
    expect(source).toContain('maxlength="180"');
    expect(source).toContain('function saveTeachBack()');
    expect(source).toContain('alloflow-life-capstone-3d-teach-back');
    expect(source).toContain('Rehearse the safe response');
    expect(source).toContain('focus(task.id, true)');
    expect(source).toContain('aria-current', 'step');
    scripts.forEach((match, index) => expect(() => new vm.Script(match[1], { filename: `capstone#script-${index + 1}` })).not.toThrow());
    expect(publicCopy).toBe(source);
  });

  it('routes A-Frame action controls through the shared procedure API', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const dom = new JSDOM('<div></div>', { runScripts: 'outside-only' });
    const components = {};
    dom.window.AFRAME = { registerComponent: (name, definition) => { components[name] = definition; } };
    dom.window.eval(scripts[0][1]);
    const selected = [];
    dom.window.lifeSkillsCapstone = { chooseProcedureSlot: slot => selected.push(slot) };
    const control = dom.window.document.createElement('a-box');
    components['capstone-action'].init.call({ el: control, data: { slot: 2 } });
    control.click();
    expect(control.classList.contains('clickable')).toBe(true);
    expect(selected).toEqual([2]);
    dom.window.close();
  });

  it('adapts mission order and coaching to Passport signals', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const dom = new JSDOM(source, {
      url: 'http://example.test/life_skills_capstone.html?focus=repair&support=supported',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });

    const messages = [];
    Object.defineProperty(dom.window, 'opener', { configurable: true, value: { closed: false, postMessage: payload => messages.push(payload) } });
    dom.window.eval(scripts.at(-1)[1]);
    const document = dom.window.document;
    expect(document.getElementById('missionTitle').textContent).toBe('Stop the problem first');
    expect(document.getElementById('supportBadge').textContent).toBe('Extra coaching');
    expect(document.getElementById('stationLabel').textContent).toContain('Bathroom');

    document.querySelectorAll('#choices .choice')[1].click();
    expect(document.getElementById('hintText').hidden).toBe(false);
    expect(document.getElementById('hintText').textContent).toContain('Stop the water');
    expect(document.getElementById('scenePanel').getAttribute('data-risk-active')).toBe('true');

    document.querySelectorAll('#choices .choice')[0].click();
    expect(document.getElementById('scenePanel').getAttribute('data-risk-active')).toBe('false');
    expect(document.querySelector('#steps .step.done').textContent).toContain('Coached');
    expect(document.getElementById('state-label-shutoff').getAttribute('text')).toContain('COACHED');

    for (let remaining = 0; remaining < 4; remaining += 1) {
      const safeChoice = document.querySelector('#choices .choice.safe');
      expect(safeChoice).not.toBeNull();
      safeChoice.click();
    }

    expect(document.getElementById('transferSummary').hidden).toBe(false);
    expect(document.getElementById('firstTryCount').textContent).toBe('4');
    expect(document.getElementById('selfCorrectedCount').textContent).toBe('0');
    expect(document.getElementById('coachedCount').textContent).toBe('1');
    expect(document.getElementById('transferRecommendation').textContent).toContain('Control a water leak');
    expect(document.getElementById('transferActionButton').getAttribute('data-station')).toBe('shutoff');
    const latestProgress = messages.filter(message => message.type === 'alloflow-life-capstone-3d-progress').at(-1);
    expect(latestProgress).toMatchObject({ firstTry: 4, selfCorrected: 0, coached: 1, contextTransfer: 0, procedurePractice: 0, recommendedTask: 'shutoff' });

    document.getElementById('transferActionButton').click();
    expect(document.getElementById('stationLabel').textContent).toContain('Bathroom');
    expect(document.getElementById('supportBadge').textContent).toBe('Guided practice');
    expect(document.getElementById('capstoneStatus').textContent).toContain('Targeted replay');
    expect(document.getElementById('contextBadge').textContent).toBe('Water spreading');
    expect(document.getElementById('contextBadge').getAttribute('data-shifted')).toBe('true');
    expect(document.getElementById('situation').textContent).toContain('stored items');
    expect(document.getElementById('scenePanel').getAttribute('data-context-shift')).toBe('true');
    expect(document.getElementById('capstoneScene').getAttribute('background')).toBe('color: #101d35');
    expect(document.getElementById('sceneNote').getAttribute('value')).toContain('WATER MOVING');
    expect(document.querySelector('#choices .choice.safe')).toBeNull();
    expect(document.getElementById('transferSummary').hidden).toBe(true);
    expect(document.querySelector('#steps .step.current').textContent).toContain('Replay:');
    expect([...document.querySelectorAll('#steps .step')].filter(button => button.disabled)).toHaveLength(4);
    expect(document.getElementById('state-label-shutoff').parentElement.getAttribute('visible')).toBe('false');
    let saved = JSON.parse(dom.window.localStorage.getItem('alloflow-life-capstone-3d-progress-v1'));
    expect(saved).toMatchObject({ replayTarget: 'shutoff', replayFrom: 'coached', replayContextFrom: 'routine', support: 'guided', contexts: { shutoff: 'spreading-water' } });

    [...document.querySelectorAll('#choices .choice')].find(button => button.textContent.includes('Close the small water shutoff')).click();
    expect(document.getElementById('transferSummary').hidden).toBe(false);
    expect(document.getElementById('firstTryCount').textContent).toBe('5');
    expect(document.getElementById('coachedCount').textContent).toBe('0');
    expect(document.getElementById('contextTransferSummary').textContent).toBe('Context shifts completed: 1 of 5.');
    expect(document.getElementById('transferActionButton').hasAttribute('data-station')).toBe(false);
    expect(document.getElementById('transferActionButton').getAttribute('data-procedure')).toBe('shutoff');
    expect(document.getElementById('procedurePracticeSummary').textContent).toBe('Action sequences practiced: 0 of 5.');
    expect(document.getElementById('state-label-shutoff').getAttribute('text')).toContain('FIRST TRY');
    saved = JSON.parse(dom.window.localStorage.getItem('alloflow-life-capstone-3d-progress-v1'));
    expect(saved.replayTarget).toBe('');
    expect(saved.outcomes.shutoff).toBe('first-try');
    expect(saved.contextTransfers.shutoff).toBe(true);
    expect(messages.find(message => message.type === 'alloflow-life-capstone-3d-targeted-replay-start')).toMatchObject({ task: 'shutoff', previousOutcome: 'coached', previousContext: 'routine', context: 'spreading-water', support: 'guided' });
    expect(messages.find(message => message.type === 'alloflow-life-capstone-3d-replay-complete')).toMatchObject({ task: 'shutoff', previousOutcome: 'coached', outcome: 'first-try', contextChanged: true, contextTransfer: 1, firstTry: 5, coached: 0 });
    dom.window.close();
  }, 15000);

  it('turns a completed station into persistent three-step 3D action practice', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const dom = new JSDOM(source, {
      url: 'http://example.test/life_skills_capstone.html?focus=repair&support=supported',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const messages = [];
    Object.defineProperty(dom.window, 'opener', { configurable: true, value: { closed: false, postMessage: payload => messages.push(payload) } });
    dom.window.eval(scripts.at(-1)[1]);
    const document = dom.window.document;

    document.querySelector('#choices .choice.safe').click();
    document.querySelector('#steps .step.done').click();
    expect(document.getElementById('procedureButton').hidden).toBe(false);
    document.getElementById('procedureButton').click();

    expect(document.getElementById('stationLabel').textContent).toContain('Action rehearsal');
    expect(document.getElementById('stationTitle').textContent).toContain('Practice: Control a water leak');
    expect(document.getElementById('procedureProgress').hidden).toBe(false);
    expect(document.getElementById('choices').getAttribute('aria-label')).toBe('Action sequence choices');
    expect(document.getElementById('scenePanel').getAttribute('data-action-practice')).toBe('true');
    expect(document.getElementById('actionSequence3d').getAttribute('visible')).toBe('true');
    expect(document.getElementById('actionConsole3d').getAttribute('visible')).toBe('true');
    expect(document.getElementById('procedure-effects-shutoff').getAttribute('visible')).toBe('true');
    expect(document.getElementById('procedure-risk-shutoff').getAttribute('visible')).toBe('true');
    expect(document.getElementById('procedure-control-shutoff').getAttribute('visible')).toBe('false');
    expect(document.getElementById('sceneNote').getAttribute('value')).toContain('ACTION 1 OF 3');
    expect([...document.querySelectorAll('#steps .step')].filter(button => button.disabled)).toHaveLength(4);

    let practiceState = JSON.parse(dom.window.localStorage.getItem('alloflow-life-capstone-3d-progress-v1'));
    const wrongSlot = practiceState.procedureChoices.shutoff.indexOf('contain-water');
    const controlSlot = practiceState.procedureChoices.shutoff.indexOf('valve-close');
    dom.window.lifeSkillsCapstone.chooseProcedureSlot(wrongSlot);
    expect(document.getElementById('feedback').textContent).toContain('Step 1 is Control');
    expect(document.getElementById('actionStepOrb1').getAttribute('color')).toBe('#fb7185');
    expect(document.getElementById('actionControl' + (wrongSlot + 1)).getAttribute('color')).toBe('#fb7185');
    expect(document.getElementById('procedure-risk-shutoff').getAttribute('visible')).toBe('true');

    dom.window.lifeSkillsCapstone.chooseProcedureSlot(controlSlot);
    expect(document.getElementById('actionStepOrb1').getAttribute('color')).toBe('#4ade80');
    expect(document.getElementById('procedure-risk-shutoff').getAttribute('visible')).toBe('false');
    expect(document.getElementById('procedure-control-shutoff').getAttribute('visible')).toBe('true');
    expect(document.getElementById('actionStepOrb2').getAttribute('color')).toBe('#facc15');
    const midPractice = dom.window.localStorage.getItem('alloflow-life-capstone-3d-progress-v1');

    const resumed = new JSDOM(source, {
      url: 'http://example.test/life_skills_capstone.html?focus=repair&support=supported',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    resumed.window.localStorage.setItem('alloflow-life-capstone-3d-progress-v1', midPractice);
    resumed.window.eval(scripts.at(-1)[1]);
    expect(resumed.window.document.getElementById('instruction').textContent).toContain('Step 2 of 3 - Stabilize');
    expect(resumed.window.document.getElementById('actionSequence3d').getAttribute('visible')).toBe('true');
    expect(resumed.window.document.getElementById('actionConsole3d').getAttribute('visible')).toBe('true');
    expect(resumed.window.document.getElementById('procedure-control-shutoff').getAttribute('visible')).toBe('true');
    resumed.window.close();

    [...document.querySelectorAll('#choices .procedure-choice')].find(button => button.textContent.includes('Place a bucket')).click();
    expect(document.getElementById('procedure-stabilize-shutoff').getAttribute('visible')).toBe('true');
    [...document.querySelectorAll('#choices .procedure-choice')].find(button => button.textContent.includes('Tell a responsible adult')).click();

    expect(document.getElementById('scenePanel').getAttribute('data-action-practice')).toBe('false');
    expect(document.getElementById('actionSequence3d').getAttribute('visible')).toBe('false');
    expect(document.getElementById('actionConsole3d').getAttribute('visible')).toBe('false');
    expect(document.getElementById('procedure-connect-shutoff').getAttribute('visible')).toBe('true');
    expect(document.getElementById('procedureButton').textContent).toContain('practiced');
    const saved = JSON.parse(dom.window.localStorage.getItem('alloflow-life-capstone-3d-progress-v1'));
    expect(saved.procedures.shutoff).toBe(true);
    expect(saved.procedureMistakes.shutoff).toBe(1);
    expect(messages.find(message => message.type === 'alloflow-life-capstone-3d-procedure-start')).toMatchObject({ task: 'shutoff', support: 'supported' });
    expect(messages.find(message => message.type === 'alloflow-life-capstone-3d-procedure-practiced')).toMatchObject({ task: 'shutoff', mistakes: 1, used3dControls: true, procedurePractice: 1 });
    expect(messages.filter(message => message.type === 'alloflow-life-capstone-3d-progress').at(-1)).toMatchObject({ procedurePractice: 1 });
    dom.window.close();
  }, 15000);

  it('changes every situation for the independent transfer challenge', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const dom = new JSDOM(source, {
      url: 'http://example.test/life_skills_capstone.html?focus=kitchen&support=guided',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });

    dom.window.eval(scripts.at(-1)[1]);
    const document = dom.window.document;
    ['stove', 'alarm', 'lint', 'shutoff', 'visibility'].forEach(() => document.querySelector('#choices .choice.safe').click());
    document.getElementById('challengeButton').click();

    expect(document.getElementById('supportBadge').textContent).toBe('Independent transfer');
    expect(document.getElementById('contextBadge').getAttribute('data-shifted')).toBe('true');
    expect(document.getElementById('scenePanel').getAttribute('data-context-shift')).toBe('true');
    expect(document.getElementById('challengeNote').textContent).toContain('Situations, order, and answer choices changed');
    expect(document.querySelector('#choices .choice.safe')).toBeNull();
    const saved = JSON.parse(dom.window.localStorage.getItem('alloflow-life-capstone-3d-progress-v1'));
    expect(Object.values(saved.contexts)).toEqual(expect.arrayContaining(['distraction', 'time-pressure', 'spreading-water', 'low-light', 'route-change']));
    expect(saved.contextTransfers).toEqual({});
    expect(saved.procedures).toEqual({});
    dom.window.close();
  });

  it('distinguishes an unprompted self-correction from coached practice', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const dom = new JSDOM(source, {
      url: 'http://example.test/life_skills_capstone.html?focus=transit&support=independent',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });

    dom.window.eval(scripts.at(-1)[1]);
    const document = dom.window.document;
    expect(document.getElementById('stationLabel').textContent).toContain('Transit');
    expect(document.querySelector('#choices .choice.safe')).toBeNull();

    document.querySelectorAll('#choices .choice')[1].click();
    expect(document.getElementById('hintText').hidden).toBe(true);
    document.querySelectorAll('#choices .choice')[0].click();

    expect(document.querySelector('#steps .step.done').textContent).toContain('Self-corrected');
    expect(document.getElementById('state-label-visibility').getAttribute('text')).toContain('CORRECTED');
    const saved = JSON.parse(dom.window.localStorage.getItem('alloflow-life-capstone-3d-progress-v1'));
    expect(saved.outcomes.visibility).toBe('self-corrected');
    expect(saved.hinted.visibility).toBeUndefined();
    dom.window.close();
  });

  it('does not overstate older completed missions that lack evidence records', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const dom = new JSDOM(source, {
      url: 'http://example.test/life_skills_capstone.html?focus=kitchen&support=guided',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    dom.window.localStorage.setItem('alloflow-life-capstone-3d-progress-v1', JSON.stringify({
      missionFocus: 'kitchen',
      support: 'guided',
      mode: 'guided',
      order: ['stove', 'alarm', 'lint', 'shutoff', 'visibility'],
      done: { stove: true, alarm: true, lint: true, shutoff: true, visibility: true },
      attempts: {},
      risk: {},
      missteps: 0,
      hints: 0,
    }));

    dom.window.eval(scripts.at(-1)[1]);
    const document = dom.window.document;
    expect(document.getElementById('transferSummary').hidden).toBe(false);
    expect(document.getElementById('firstTryCount').textContent).toBe('0');
    expect(document.getElementById('transferRecommendation').textContent).toContain('full evidence trail is not available');
    expect(document.getElementById('transferActionButton').textContent).toBe('Start evidence challenge');
    expect(document.getElementById('transferActionButton').hasAttribute('data-station')).toBe(false);
    expect(document.getElementById('transferActionButton').hasAttribute('data-procedure')).toBe(false);
    dom.window.close();
  });
});
