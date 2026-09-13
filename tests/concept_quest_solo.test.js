import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const engine = require('../concept_quest_engine.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const source = { id: 'solo-resource', title: 'Plant expedition', data: { questions: [
  { question: 'What helps plants grow?', options: ['Water', 'Stone'], correctAnswer: 'Water', concept: 'Plant needs', factCheck: 'Plants absorb water through their roots.' },
  { question: 'What collects light?', options: ['Leaves', 'Roots'], correctAnswer: 'Leaves', concept: 'Photosynthesis' },
  { question: 'Which is evidence?', options: ['A measurement', 'A guess'], correctAnswer: 'A measurement', concept: 'Evidence' }
] } };
const tr = (key, fallback) => fallback;
let host, root, api;
beforeAll(() => { window.React = React; window.AlloModules.ConceptQuestEngine = engine; loadAlloModule('concept_quest_solo_module.js'); api = window.AlloModules; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; window.localStorage.clear(); delete window.__alloFirebase; });
const mount = async (props = {}) => { if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); } await act(async () => root.render(React.createElement(api.ConceptQuestSolo, { generatedContent: source, t: key => key, onClose: vi.fn(), ...props }))); };
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
const click = async el => { expect(el).toBeTruthy(); await act(async () => el.click()); };

describe('Standalone Concept Quest', () => {
  it.each(engine.ROLES.map(role => [role.id, role.abilityId]))('lets the %s role complete all rooms with one action per turn', (roleId, abilityId) => {
    let quest = api.createConceptQuestSoloSession(engine, source, tr);
    for (let room = 2; room <= 8; room++) {
      const move = api.ConceptQuestSoloEngine.travel(engine,quest, 'room-' + room);
      expect(move.error).toBeUndefined(); quest = move.quest;
      for (let turn = 0; quest.phase === 'battle' && turn < 12; turn++) {
        const current = engine.getRoom(quest, quest.currentRoomId);
        const result = api.ConceptQuestSoloEngine.resolveTurn(engine,quest,{roleId,abilityId,response:{answerIndex:current.challenge.correctIndex}});
        expect(result.summary.gradable).toBe(true); quest = result.quest;
      }
      expect(quest.phase).not.toBe('defeat'); expect(quest.phase).not.toBe('battle');
    }
    expect(quest.phase).toBe('complete'); expect(api.ConceptQuestSoloEngine.createDebrief(quest).accuracy).toBe(100);
    expect(quest.party.hp).toBeGreaterThan(0);
  });
  it('starts locally, resolves an answer immediately, and waits for recap before another answer', async () => {
    const write = vi.fn(); window.__alloFirebase = { updateDoc: write };
    await mount(); await click(button('Start solo adventure'));
    await click(host.querySelector('[data-solo-travel="room-2"]'));
    expect(button('3. Resolve this turn').disabled).toBe(true);
    await click(host.querySelector('input[type="radio"]'));
    await click(button('3. Resolve this turn'));
    expect(host.textContent).toContain('Correct. Your ability succeeded!');
    expect(host.textContent).toContain('Answer guide: Water');
    expect(host.querySelector('input[type="radio"]')).toBeNull();
    await click(button('Continue adventure'));
    expect(button('3. Resolve this turn').disabled).toBe(true);
    expect([...host.querySelectorAll('input[type="radio"]')].some(el => el.checked)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
  it('gives wrong-answer feedback and clears the response for the next question', async () => {
    await mount(); await click(button('Start solo adventure')); await click(host.querySelector('[data-solo-travel="room-2"]'));
    await click(host.querySelectorAll('input[type="radio"]')[1]); await click(button('3. Resolve this turn'));
    expect(host.textContent).toContain('Review the concept and try another turn.'); expect(host.textContent).toContain('lost 1 health');
    await click(button('Continue adventure')); expect(host.textContent).toContain('What collects light?');
  });
  it.each([[], null, {}])('handles empty or malformed source questions: %j', async questions => {
    await mount({ generatedContent: { data: { questions } } });
    expect(button('Start solo adventure').disabled).toBe(true);
  });
  it('keeps every assessment format while preserving visual context', () => {
    const imageQuestion = { ...source.data.questions[0], imageUrl:'diagram.png', imageAltText:'A plant', optionImageUrls:['water.png','stone.png'], optionImageAltTexts:['Water','Stone'] };
    const quest = api.createConceptQuestSoloSession(engine,{data:{questions:[imageQuestion,{type:'short-answer',question:'Explain roots.'}]}},tr);
    expect(quest.excludedQuestions).toBe(0); expect(quest.solo.bank).toHaveLength(2); expect(api.ConceptQuestSoloEngine.currentItem(quest).imageUrl).toBe('diagram.png');
    const traveled=api.ConceptQuestSoloEngine.travel(engine,quest,'room-2').quest; expect(engine.getRoom(traveled,'room-2').challenge.optionImageAltTexts).toEqual(['Water','Stone']);
  });
  it('launches written assessments with explicit ungraded self-review', async () => {
    await mount({ generatedContent: { data: { questions: [{ type: 'short-answer', question: 'Explain roots.' }] } } });
    expect(button('Start solo adventure').disabled).toBe(false);
    await click(button('Start solo adventure')); await click(host.querySelector('[data-solo-travel="room-2"]'));
    expect(host.textContent).toContain('self-review checkpoint'); expect(button('3. Record self-review and continue').disabled).toBe(true);
  });
  it('requires an explicit restart and resets when another resource replaces the source', async () => {
    await mount(); await click(button('Start solo adventure')); await click(host.querySelector('[data-solo-travel="room-2"]'));
    await click(button('Restart adventure')); expect(host.textContent).toContain('This replaces the saved progress for this resource.');
    await click(button('Keep playing')); expect(host.querySelector('input[type="radio"]')).toBeTruthy();
    await click(button('Restart adventure')); await click(button('Restart from the beginning')); expect(host.textContent).toContain('Scholar Base'); expect(host.querySelector('input[type="radio"]')).toBeNull();
    await mount({ generatedContent: { ...source, id: 'other-resource' } }); expect(button('Start solo adventure')).toBeTruthy();
  });
  it('distinguishes partial credit from a fully correct encounter result',async()=>{
    await mount({generatedContent:{id:'partial-source',data:{questions:[{type:'multi-select',question:'Select both living things',options:['Tree','Flower','Stone'],correctAnswers:['Tree','Flower']}]}}});
    await click(button('Start solo adventure'));await click(host.querySelector('[data-solo-travel="room-2"]'));await click(host.querySelector('[data-solo-question-type] input[type="checkbox"]'));await click(button('3. Resolve this turn'));
    expect(host.textContent).toContain('Partly correct. Review the answer guide');expect(host.textContent).toContain('50 / 100 for this item.');expect(host.textContent).toContain('Answer guide: Tree; Flower');expect(host.textContent).not.toContain('Correct. Your ability succeeded!');
  });

});
