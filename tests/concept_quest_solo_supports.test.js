import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const solo = require('../concept_quest_solo_engine.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let Component, host, root, item, response;
beforeAll(() => {
  const compiled = require('@babel/core').transformSync(fs.readFileSync('concept_quest_solo_question_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  Component = new Function('React', compiled + '\nreturn ConceptQuestSoloQuestion;')(React);
  window.AlloModules.ConceptQuestSoloEngine = solo;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; });
function Harness() {
  const [value, setValue] = React.useState(solo.initialResponse(item)); response = value;
  return React.createElement(Component, { item, response: value, onChange: setValue, guideOpen: value.guideRevealed, t: key => key });
}
async function mount(authored) {
  item = solo.normalizeItems({ data: { questions: [authored] } })[0];
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function change(element, value) {
  expect(element).toBeTruthy();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('change', { bubbles: true })); });
}
const choice = (field, index, within = host) => within.querySelector('[data-solo-choice-field="' + field + '"][data-solo-choice-index="' + index + '"]');

describe('Solo Quest authored choice supports', () => {
  it.each(['mcq', 'multi-select'])('preserves %s translations, image descriptions, and the selected source answer', async type => {
    await mount({ type, question: 'Choisissez le conducteur.', question_en: 'Choose the conductor.', options: ['Cuivre', 'Bois'], options_en: ['Copper', 'Wood'], correctAnswer: 'Cuivre', correctAnswers: ['Cuivre'], optionImageUrls: ['https://example.test/copper.png', 'data:image/png;base64,aGVsbG8='], optionImageAltTexts: ['  Copper wire  ', '   '] });
    expect(host.textContent).toContain('Choose the conductor.');
    expect(choice('options', 0).textContent).toContain('Copper');
    expect(choice('options', 1).textContent).toContain('Wood');
    expect(choice('options', 0).querySelector('img').alt).toBe('Copper wire');
    expect(choice('options', 1).querySelector('img').alt).toBe('No visual description provided.');
    expect(choice('options', 1).querySelector('img').getAttribute('src')).toBe('data:image/png;base64,aGVsbG8=');
    await click(host.querySelector('input'));
    expect(solo.grade(item, response)).toMatchObject({ correct: true, gradable: true });
  });

  it.each(['canonical', 'legacy', 'shared-answer'])('keeps answer/evidence media separate using %s fields', async fields => {
    const authored = { type: 'answer-evidence', question: 'Quel changement?', answerOptions: ['Évaporation', 'Condensation'], answerOptions_en: ['Evaporation', 'Condensation'], correctAnswer: 'Condensation', evidencePrompt: 'Quelle observation?', evidencePrompt_en: 'Which observation supports your answer?', evidenceOptions: ['Des gouttes', 'Le soleil'], evidenceOptions_en: ['Water droplets', 'Sunshine'], correctEvidence: 'Des gouttes' };
    const answerStem = fields === 'canonical' ? 'answerOption' : fields === 'legacy' ? 'answer' : 'option';
    const evidenceStem = fields === 'canonical' ? 'evidenceOption' : 'evidence';
    if (fields === 'shared-answer') { authored.options_en = authored.answerOptions_en; delete authored.answerOptions_en; }
    authored[answerStem + 'ImageUrls'] = ['evap.png', 'condense.png'];
    authored[answerStem + 'ImageAltTexts'] = ['Rising vapor', 'Forming droplets'];
    authored[evidenceStem + 'ImageUrls'] = ['droplets.png', 'sun.png'];
    authored[evidenceStem + 'ImageAltTexts'] = ['Droplets on cold glass', 'Sunlight'];
    await mount(authored);
    expect(host.textContent).toContain('Which observation supports your answer?');
    expect(choice('answerOptions', 0).textContent).toContain('Evaporation');
    expect(choice('evidenceOptions', 0).textContent).toContain('Water droplets');
    expect(choice('answerOptions', 1).querySelector('img').alt).toBe('Forming droplets');
    expect(choice('evidenceOptions', 0).querySelector('img').alt).toBe('Droplets on cold glass');
    expect(host.querySelectorAll('img')).toHaveLength(4);
    const radios = host.querySelectorAll('input[type="radio"]');
    await click(radios[1]); await click(radios[2]);
    expect(response).toMatchObject({ answerIndex: 1, evidenceIndex: 0 });
    expect(solo.grade(item, response).correct).toBe(true);
  });

  it.each(['canonical', 'plural'])('keeps sequence supports attached to canonical steps with %s principle image fields', async fields => {
    const authored = { type: 'sequence-sense', question: 'Corrigez les étapes.', items: ['Chauffer', 'Fondre', 'Refroidir'], items_en: ['Heat', 'Melt', 'Cool'], itemImageUrls: ['heat.png', 'melt.png', 'cool.png'], itemImageAltTexts: ['Heating a solid', 'Melting material', 'Cooling a liquid'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0, orderingPrinciple: 'Temperature changes', principleOptions: ['Temperature changes', 'Size'], principleOptions_en: ['Follow temperature', 'Follow size'], principleOptionsImageUrls: ['legacy-temperature.png', 'legacy-size.png'], principleOptionsImageAltTexts: ['Legacy thermometer', 'Legacy ruler'] };
    if (fields === 'canonical') { authored.principleOptionImageUrls = ['temperature.png', 'size.png']; authored.principleOptionImageAltTexts = ['Thermometer', 'Ruler']; }
    await mount(authored);
    expect(choice('principleOptions', 0).textContent).toContain('Follow temperature');
    expect(choice('principleOptions', 0).querySelector('img').getAttribute('src')).toBe(fields === 'canonical' ? 'temperature.png' : 'legacy-temperature.png');
    expect(choice('principleOptions', 0).querySelector('img').alt).toBe(fields === 'canonical' ? 'Thermometer' : 'Legacy thermometer');
    const presented = host.querySelector('[data-solo-presented-order]');
    expect([...presented.querySelectorAll('img')].map(image => image.alt)).toEqual(['Melting material', 'Heating a solid', 'Cooling a liquid']);
    expect(presented.querySelector('li').textContent).toContain('Melt');
    await click(host.querySelector('button[aria-label="Move up: Chauffer"]'));
    const arranged = host.querySelector('ol[aria-label="Your order"]');
    expect([...arranged.querySelectorAll('img')].map(image => image.alt)).toEqual(['Heating a solid', 'Melting material', 'Cooling a liquid']);
    expect(response.order).toEqual([0, 1, 2]);
    await change(host.querySelector('select'), 'no');
    const selects = host.querySelectorAll('select');
    expect(selects[1].options[1].textContent).toContain('Melt');
    await change(selects[1], '0'); await change(selects[2], 'Temperature changes');
    expect(solo.grade(item, response).correct).toBe(true);
  });

  it('renders pair-side and replacement-partner supports without changing response values', async () => {
    await mount({ type: 'relation-mismatch', question: 'Réparez la paire.', pairs: [{ left: 'Chat', right: 'Plante', left_en: 'Cat', leftImageUrl: 'cat.png', leftImageAltText: 'A cat', rightImageUrl: 'plant.png', rightImageAltText: 'A plant' }, { left: 'Rose', right: 'Plante' }], pairs_en: [{ left: 'Ignored fallback', right: 'Plant' }, { left: 'Rose', right: 'Plant' }], wrongPairIndex: 0, correctPartnerForWrong: 'Animal', candidatePartners: ['Animal', 'Plante'], candidatePartners_en: ['Animal translation', 'Plant translation'], candidatePartnerImageUrls: ['animal.png', 'plant-choice.png'], candidatePartnerImageAltTexts: ['Animal group', 'Plant group'] });
    const pair = choice('pairs', 0);
    expect(pair.textContent).toContain('Cat'); expect(pair.textContent).toContain('Plant');
    expect(pair.textContent).not.toContain('Ignored fallback');
    expect([...pair.querySelectorAll('img')].map(image => image.alt)).toEqual(['A cat', 'A plant']);
    expect(choice('candidatePartners', 0).querySelector('img').alt).toBe('Animal group');
    const selects = host.querySelectorAll('select');
    expect(selects[1].options[1].textContent).toContain('Animal translation');
    await change(selects[0], '0'); await change(selects[1], 'Animal');
    expect(response).toMatchObject({ pairIndex: 0, partnerAnswer: 'Animal' });
    expect(solo.grade(item, response).correct).toBe(true);
  });

  it('renders authored markup-looking translations as text', async () => {
    await mount({ type: 'mcq', question: 'Which inequality?', options: ['x < 3', 'x > 3'], options_en: ['<script>literal translation</script>', 'x > 3'], correctAnswer: 'x < 3' });
    expect(choice('options', 0).textContent).toContain('<script>literal translation</script>');
    expect(host.querySelector('script')).toBeNull();
    await click(host.querySelector('input')); expect(solo.grade(item, response).correct).toBe(true);
  });
});
