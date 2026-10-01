// Translate-all must not send inline pictures to the model, must report an
// unusable reply as a failure (no silent English copy), and must not carry a
// teacher's verification into a machine-translated copy. FIX0927_PK_MOD points
// at a saved pre-fix phase_k_helpers_module.js for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let K;
beforeAll(() => {
  const win = { AlloModules: {} };
  vm.runInNewContext(readFileSync(process.env.FIX0927_PK_MOD || 'phase_k_helpers_module.js', 'utf8'), { window: win, React: { useState() {}, useEffect() {}, useRef() {}, useCallback() {}, useMemo() {} }, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout });
  K = win.AlloModules.PhaseKHelpers;
});
const big = 'data:image/png;base64,' + 'A'.repeat(512 * 1024);
const deps = (reply, prompts = []) => ({ callGemini: async (prompt) => { prompts.push(prompt); return typeof reply === 'function' ? reply(prompt) : reply; }, cleanJson: (s) => s, warnLog: () => {} });

describe('translate-all', () => {
  it('keeps inline pictures out of the prompt and restores them in the copy', async () => {
    const prompts = [];
    const item = { id: 'g1', type: 'glossary', title: 'Terms', data: [{ term: 'Leaf', def: 'Part of a plant', image: big }] };
    const reply = (prompt) => JSON.stringify(JSON.parse(prompt.match(/Input Data: (\[.*\])/)[1]).map((row) => ({ ...row, translations: { Spanish: 'Hoja: parte de una planta' } })));
    const out = await K.translateResourceItem(item, 'Spanish', deps(reply, prompts));
    expect(prompts[0].length).toBeLessThan(5000);
    expect(prompts[0]).not.toContain('data:image');
    expect(out.data[0].image).toBe(big);
    expect(out.data[0].translations.Spanish).toContain('Hoja');
  });
  it('restores a picture the reply dropped at its original place', async () => {
    const item = { id: 'g2', type: 'glossary', title: 'Terms', data: [{ term: 'Leaf', def: 'Part of a plant', image: big }] };
    const out = await K.translateResourceItem(item, 'Spanish', deps('[{"term":"Leaf","def":"Part of a plant","translations":{"Spanish":"Hoja"}}]'));
    expect(out.data[0].image).toBe(big);
  });
  it('reports an unusable or empty reply instead of returning the English original', async () => {
    const quiz = { id: 'q1', type: 'quiz', title: 'Quiz', data: { questions: [{ question: 'Q?', options: ['A', 'B'], correctAnswer: 'A' }] } };
    await expect(K.translateResourceItem(quiz, 'Spanish', deps('{"questions":[{"question":"Q'))).rejects.toThrow();
    await expect(K.translateResourceItem(quiz, 'Spanish', deps('{}'))).rejects.toThrow();
    await expect(K.translateResourceItem({ id: 's1', type: 'simplified', title: 'Text', data: 'Hello' }, 'Spanish', deps(''))).rejects.toThrow();
    await expect(K.translateResourceItem({ id: 'i1', type: 'image', title: 'Pic', data: { imageUrl: big } }, 'Spanish', deps('{}'))).rejects.toThrow();
  });
  it('does not carry teacher verification into the machine-translated copy', async () => {
    const quiz = { id: 'q2', type: 'quiz', title: 'Quiz', data: { questions: [{ question: 'Q?', options: ['A', 'B'], correctAnswer: 'A', factCheck: '[[KEY: CONFIRMED]] Verified', keyCheck: { status: 'confirmed', checkedKey: 'A' } }] } };
    const out = await K.translateResourceItem(quiz, 'Spanish', deps((prompt) => prompt.match(/Input Data: (\{.*\})/)[1].replace('"Q?"', '"¿P?"')));
    expect(out.data.questions[0].question).toBe('¿P?');
    expect(out.data.questions[0].keyCheck.status).not.toBe('confirmed');
    const aid = { id: 'm1', type: 'memory-aid', title: 'Aid', data: { cards: [{ id: 'c1', target: 'Cell', factVerified: true }] } };
    const translated = await K.translateResourceItem(aid, 'Spanish', deps('{"cards":[{"id":"c1","target":"Célula","factVerified":true}]}'));
    expect(translated.data.cards[0].target).toBe('Célula');
    expect(translated.data.cards[0].factVerified).toBe(false);
  });
});
