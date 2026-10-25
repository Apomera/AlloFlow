import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let translate;
beforeAll(() => {
  const win = { AlloModules: {} };
  const context = vm.createContext({ window: win, React: { useState() {}, useEffect() {}, useRef() {}, useCallback() {}, useMemo() {} },
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout });
  for (const file of ['text_pipeline_helpers_module.js', 'phase_k_helpers_module.js']) vm.runInContext(readFileSync(file, 'utf8'), context);
  translate = win.AlloModules.PhaseKHelpers.translateResourceItem;
});

const marker = '--- ENGLISH TRANSLATION ---';
const passage = () => ({ id: 'reading-es', type: 'simplified', title: 'Water',
  data: `El agua importa.\n\n${marker}\n\nL’eau compte.`,
  config: { language: 'Spanish', translationTarget: 'French', translationPolicy: { enabled: true, target: 'French', mode: 'auto' }, grade: '3' },
  meta: { derivedFrom: 'source-original', origin: 'reading-library' } });
const deps = (replies, extra = {}) => {
  let index = 0;
  return { currentUiLanguage: 'French', translationMode: 'auto', selectedLanguages: ['Spanish', 'German'],
    callGemini: vi.fn(async prompt => typeof replies === 'function' ? replies(prompt, index++) : replies[index++]),
    cleanJson: text => text, warnLog: vi.fn(), ...extra };
};
const inputData = prompt => JSON.parse(prompt.match(/Input Data: (.+)\n/)[1]);

describe('header translation uses the resolved primary and companion languages', () => {
  it('translates the Spanish primary, then makes a French companion for the new German text', async () => {
    const original = passage(), before = structuredClone(original);
    const d = deps(['Wasser ist wichtig.', 'L’eau est importante.']);
    const result = await translate(original, 'German', d);
    expect(d.callGemini).toHaveBeenCalledTimes(2);
    expect(d.callGemini.mock.calls[0][0]).toContain('El agua importa.');
    expect(d.callGemini.mock.calls[0][0]).not.toContain('L’eau compte.');
    expect(d.callGemini.mock.calls[1][0]).toContain('into French');
    expect(d.callGemini.mock.calls[1][0]).toContain('Wasser ist wichtig.');
    expect(result.data).toBe(`Wasser ist wichtig.\n\n${marker}\n\nL’eau est importante.`);
    expect(result.config).toMatchObject({ language: 'German', grade: '3', translationTarget: 'French', translationPolicy: { enabled: true, target: 'French', mode: 'auto' },
      translationOf: original.id, translationSourceId: original.id, translationSourceLanguage: 'Spanish' });
    expect(result).toMatchObject({ language: 'German', translationTarget: 'French', translationOf: original.id, translationSourceId: original.id, translationSourceLanguage: 'Spanish' });
    expect(result.meta).toEqual({ ...original.meta, translatedTo: 'German' });
    expect(original).toEqual(before);
  });

  it('turns companions off and removes a provider-added stale companion', async () => {
    const d = deps([`Wasser ist wichtig.\n${marker}\nOld companion`], { translationMode: 'off' });
    const result = await translate(passage(), 'German', d);
    expect(d.callGemini).toHaveBeenCalledTimes(1);
    expect(result.data).toBe('Wasser ist wichtig.');
    expect(result.config).toMatchObject({ language: 'German', translationTarget: '', attachedTranslationTarget: '', translationPolicy: { enabled: false, target: '', mode: 'off' } });
    expect(result.translationTarget).toBe('');
  });

  it('does not make a redundant companion in the primary language', async () => {
    const d = deps(['Wasser ist wichtig.'], { currentUiLanguage: 'German' });
    const result = await translate(passage(), 'German', d);
    expect(d.callGemini).toHaveBeenCalledTimes(1);
    expect(result.config.translationPolicy).toEqual({ enabled: false, target: '', mode: 'auto' });
    const equivalent = deps(['Wasser ist wichtig.'], { translationPolicy: { enabled: true, target: 'de-DE', mode: 'auto' } });
    expect((await translate(passage(), 'German', equivalent)).translationTarget).toBe('');
    expect(equivalent.callGemini).toHaveBeenCalledTimes(1);
  });

  it('honors the action policy despite different ambient generation preferences', async () => {
    const policy = { enabled: true, target: 'Spanish', mode: 'Spanish' };
    const d = deps(['Wasser ist wichtig.', 'El agua es importante.'], { translationMode: 'off', translationPolicy: policy });
    const result = await translate(passage(), 'German', d);
    expect(d.callGemini.mock.calls[1][0]).toContain('into Spanish');
    expect(result.translationPolicy).toEqual(policy);
    expect(result.config.translationPolicy).not.toBe(policy);
  });

  it('does not reuse source narration or word analysis on a translated copy', async () => {
    const original = { ...passage(), karaokeAudio: { clips: ['old-audio'] }, karaokeStudentAudio: { clips: ['student-audio'] },
      immersiveData: [{ word: 'agua' }], immersiveSource: 'El agua importa.', posEnriched: true,
      coverImage: 'data:image/png;base64,unchanged' };
    const result = await translate(original, 'German', deps(['Wasser.'], { translationMode: 'off' }));
    for (const key of ['karaokeAudio', 'karaokeStudentAudio', 'immersiveData', 'immersiveSource', 'posEnriched']) expect(result).not.toHaveProperty(key);
    expect(result.coverImage).toBe(original.coverImage);
    expect(original.karaokeAudio.clips).toEqual(['old-audio']);
  });

  it('keeps source lineage while clearing original-reading claims and stale generation identities', async () => {
    const original = { ...passage(), generationIdentity: { key: 'spanish-original' }, variantKey: 'spanish-grade3',
      generationConfig: { language: 'Spanish' }, generationConfigFingerprint: 'old-generation', sourceFingerprint: 'original-fingerprint',
      sourceSnapshot: { schemaVersion: 1, text: 'El agua importa.', fingerprint: 'source-fingerprint' },
      readingSupports: { anchors: [{ start: 3, end: 7 }] }, adaptedReadingSupports: { anchors: [{ start: 3, end: 7 }] },
      levelCheck: { status: 'verified' }, alignmentCheck: { status: 'aligned' },
      instructionalText: { form: 'same-text-supported', role: 'primary', replacementAuthorization: { authorized: true, source: 'educator' },
        complexity: { requestedGrade: '3', language: 'Spanish', measuredGrade: 3, method: 'old-check', bodyFingerprint: 'old-body' } },
      provenance: { sourceArtifactId: 'original-source', generationIdentity: { key: 'spanish-original' }, variantKey: 'spanish-grade3' } };
    original.config = { ...original.config, generationIdentity: original.generationIdentity, variantKey: original.variantKey,
      generationConfig: original.generationConfig, generationConfigFingerprint: 'old-generation', sourceFingerprint: 'original-fingerprint',
      instructionalText: original.instructionalText, readingSupports: original.readingSupports };
    const result = await translate(original, 'German', deps(['Wasser.'], { translationMode: 'off' }));
    expect(result.sourceSnapshot).toEqual(original.sourceSnapshot);
    expect(result.sourceFingerprint).toBe('original-fingerprint');
    expect(result.config.sourceFingerprint).toBe('original-fingerprint');
    expect(result.provenance.sourceArtifactId).toBe('original-source');
    expect(result.instructionalText).toMatchObject({ form: 'adapted', role: 'supplemental', replacementAuthorization: { authorized: false },
      complexity: { language: 'German', measuredGrade: null } });
    expect(result.config.instructionalText).toEqual(result.instructionalText);
    for (const key of ['generationIdentity', 'variantKey', 'generationConfig', 'generationConfigFingerprint']) {
      expect(result).not.toHaveProperty(key);
      expect(result.config).not.toHaveProperty(key);
      expect(result.provenance).not.toHaveProperty(key);
    }
    for (const key of ['readingSupports', 'adaptedReadingSupports', 'levelCheck', 'alignmentCheck']) expect(result).not.toHaveProperty(key);
    expect(result.config).not.toHaveProperty('readingSupports');
    expect(result.instructionalText.complexity).not.toHaveProperty('bodyFingerprint');
    expect(original.instructionalText.form).toBe('same-text-supported');
  });
});

describe('structured header translations keep companion slots language-aware', () => {
  const quiz = () => ({ id: 'quiz-es', type: 'quiz', config: { language: 'Spanish', translationTarget: 'French' },
    data: { questions: [{ id: 'q-1', type: 'mcq', question: '¿Agua?', question_en: 'Ancienne question française',
      options: ['Sí', 'No'], options_en: ['Ancien oui', 'Ancien non'], correctAnswer: 'Sí', factCheck: 'Checked', keyCheck: { status: 'confirmed' } }], reflections: [] } });

  it('requests French companions rather than moving the Spanish source into _en slots', async () => {
    const d = deps(prompt => {
      const data = inputData(prompt);
      expect(data.questions[0]).not.toHaveProperty('question_en');
      expect(data.questions[0]).not.toHaveProperty('options_en');
      return JSON.stringify({ ...data, questions: [{ ...data.questions[0], id: 'model-id', type: 'bad-type',
        question: 'Wasser?', question_en: 'De l’eau ?', options: ['Ja', 'Nein'], options_en: ['Oui', 'Non'], correctAnswer: 'WRONG' }] });
    });
    const result = await translate(quiz(), 'German', d);
    expect(d.callGemini.mock.calls[0][0]).toContain('French companion');
    expect(result.data.questions[0]).toMatchObject({ id: 'q-1', type: 'mcq', question: 'Wasser?', question_en: 'De l’eau ?',
      options: ['Ja', 'Nein'], options_en: ['Oui', 'Non'], correctAnswer: 'Ja', keyCheck: { status: 'unclear' } });
    expect(result.config.translationTarget).toBe('French');
  });

  it('removes old and provider-added companion fields recursively when disabled', async () => {
    const d = deps(prompt => {
      const data = inputData(prompt);
      return JSON.stringify({ ...data, questions: data.questions.map(q => ({ ...q, question: 'Wasser?', question_en: 'Unwanted',
        options: ['Ja', 'Nein'], options_en: ['Oui', 'Non'], explanation: `Wasser.\n${marker}\nUnwanted` })) });
    }, { translationMode: 'off' });
    const result = await translate(quiz(), 'German', d);
    expect(result.data.questions[0]).not.toHaveProperty('question_en');
    expect(result.data.questions[0]).not.toHaveProperty('options_en');
    expect(result.data.questions[0].explanation).toBe('Wasser.');
    expect(result.config.translationPolicy.enabled).toBe(false);
  });

  it('keeps structured IDs and illustrations while translating generic display fields', async () => {
    const original = { id: 'timeline-es', type: 'timeline', config: { language: 'Spanish' }, meta: { derivedFrom: 'source' },
      data: [{ id: 'event-1', date: 'Inicio', event: 'Lluvia', event_en: 'Ancienne pluie', resourceRef: 'resource-1', amount: 3,
        image: 'data:image/png;base64,original' }] };
    const d = deps(prompt => JSON.stringify(inputData(prompt).map(row => ({ ...row, id: 'bad-id', resourceRef: 'bad-ref', amount: 99,
      date: 'Anfang', date_en: 'Début', event: 'Regen', event_en: 'Pluie', image: 'data:image/png;base64,wrong' }))));
    const result = await translate(original, 'German', d);
    expect(d.callGemini.mock.calls[0][0]).not.toContain('Ancienne pluie');
    expect(result.data[0]).toMatchObject({ id: 'event-1', resourceRef: 'resource-1', amount: 3,
      image: original.data[0].image, date: 'Anfang', date_en: 'Début', event: 'Regen', event_en: 'Pluie' });
    expect(result.meta).toEqual({ derivedFrom: 'source', translatedTo: 'German' });
  });

  it('preserves a current timeline object and its progression settings', async () => {
    const original = { id: 'timeline-current', type: 'timeline', config: { language: 'Spanish' },
      data: { mode: 'chronological', progressionLabel: 'Fases', progressionLabel_en: 'Ancien titre',
        items: [{ id: 'event-1', date: 'Inicio', event: 'Lluvia', resourceRef: 'source-1' }] } };
    const d = deps(prompt => {
      const data = inputData(prompt);
      return JSON.stringify({ ...data, mode: 'model-change', progressionLabel: 'Phasen', progressionLabel_en: 'Phases',
        items: data.items.map(row => ({ ...row, date: 'Anfang', event: 'Regen', event_en: 'Pluie' })) });
    });
    const result = await translate(original, 'German', d);
    expect(result.data).toMatchObject({ mode: 'chronological', progressionLabel: 'Phasen', progressionLabel_en: 'Phases',
      items: [{ id: 'event-1', date: 'Anfang', event: 'Regen', event_en: 'Pluie', resourceRef: 'source-1' }] });
  });

  it('adds both requested glossary columns while preserving the English base and existing named languages', async () => {
    const original = { id: 'glossary', type: 'glossary', config: { language: 'English' },
      data: [{ id: 'leaf', term: 'Leaf', def: 'Part of a plant', translations: { Italian: 'Foglia: parte di una pianta' } }] };
    const d = deps(prompt => {
      expect(prompt).toContain('["German","French"]');
      const data = inputData(prompt);
      return JSON.stringify(data.map(row => ({ ...row, id: 'bad-id', term: 'Blatt', def: 'MODEL CHANGE',
        translations: { German: 'Blatt: Teil einer Pflanze', French: 'Feuille : partie d’une plante' } })));
    });
    const result = await translate(original, 'German', d);
    expect(result.data[0]).toEqual({ ...original.data[0], translations: { ...original.data[0].translations,
      German: 'Blatt: Teil einer Pflanze', French: 'Feuille : partie d’une plante' } });
    const off = deps(prompt => {
      expect(prompt).toContain('requested languages: ["German"]');
      return JSON.stringify(inputData(prompt).map(row => ({ ...row, translations: { German: 'Blatt: Pflanzenteil' } })));
    }, { translationMode: 'off' });
    const withoutCompanion = await translate(original, 'German', off);
    expect(withoutCompanion.data[0].translations).toEqual({ Italian: 'Foglia: parte di una pianta', German: 'Blatt: Pflanzenteil' });
    expect(withoutCompanion.config.translationPolicy.enabled).toBe(false);
  });

  it('keeps directions readable without exposing machine translation tokens', async () => {
    const original = { id: 'directions', type: 'directions', config: { language: 'Spanish' }, meta: { derivedFrom: 'source' },
      data: { body: 'Lee.', softGate: true, objectives: [{ id: 'goal', label: 'Leer', resourceRef: 'reading' }],
        choiceBoard: { choices: [{ resourceRef: 'reading', label: 'Lectura', description: 'Lee primero' }] } } };
    const d = deps(prompt => {
      expect(prompt).toContain('French companion in parentheses');
      expect(prompt).not.toContain(marker);
      return JSON.stringify({ title: `Aufgaben ${marker} Tâches`, body: `Lies.\n${marker}\nLis.`,
        labels: ['Lesen (Lire)'], choiceBoard: { title: 'Wahl (Choix)', prompt: 'Wähle (Choisis)',
          items: [{ label: 'Lesen (Lire)', description: 'Lies zuerst (Lis d’abord)' }] } });
    });
    const result = await translate(original, 'German', d);
    expect(JSON.stringify(result.data)).not.toContain(marker);
    expect(result.title).not.toContain(marker);
    expect(result.data.body).toContain('Lies.');
    expect(result.data.body).toContain('Lis.');
    expect(result.data.objectives[0]).toEqual({ ...original.data.objectives[0], label: 'Lesen (Lire)' });
    expect(result.data.choiceBoard.choices[0].resourceRef).toBe('reading');
    expect(result.data.softGate).toBe(true);
  });

  it('rejects a reply that loses quiz options', async () => {
    const d = deps(prompt => {
      const data = inputData(prompt);
      data.questions[0].options = ['Ja'];
      return JSON.stringify(data);
    });
    await expect(translate(quiz(), 'German', d)).rejects.toThrow(/count/);
  });

  it('rejects missing or blank required prose instead of saving blank resources', async () => {
    const faq = { id: 'faq', type: 'faq', data: [{ q: 'Why water?', a: 'We need it.' }] };
    for (const reply of ['[{}]', '[{"q":"Warum Wasser?","a":""}]']) {
      await expect(translate(faq, 'German', deps([reply], { translationMode: 'off' }))).rejects.toThrow(/display text/);
    }
    const d = deps(prompt => {
      const data = inputData(prompt);
      delete data.questions[0].question;
      return JSON.stringify(data);
    }, { translationMode: 'off' });
    await expect(translate(quiz(), 'German', d)).rejects.toThrow(/display text/);
  });

  it('rejects structured replies that omit requested companion content', async () => {
    const faq = { id: 'faq', type: 'faq', data: [{ q: 'Why water?', a: 'We need it.' }] };
    await expect(translate(faq, 'German', deps(['[{"q":"Warum Wasser?","a":"Wir brauchen es."}]']))).rejects.toThrow(/companion/);
    const d = deps(prompt => JSON.stringify(inputData(prompt)));
    await expect(translate(quiz(), 'German', d)).rejects.toThrow(/companion/);
    const glossary = { id: 'glossary', type: 'glossary', data: [{ term: 'Leaf', def: 'Plant part' }] };
    await expect(translate(glossary, 'German', deps(['[{"term":"Leaf","def":"Plant part","translations":{"German":"Blatt: Pflanzenteil"}}]']))).rejects.toThrow(/French/);
  });

  it('repoints every choice-based quiz answer to its translated option text', async () => {
    const original = { id: 'mixed-quiz', type: 'quiz', config: { language: 'English' }, data: { reflections: [], questions: [
      { id: 'ae', type: 'answer-evidence', question: 'Choose', answerOptions: ['A', 'B'], correctAnswer: 'B', evidenceOptions: ['E1', 'E2'], correctEvidence: 'E1' },
      { id: 'rel', type: 'relation-mismatch', question: 'Match', candidatePartners: ['P1', 'P2'], correctPartnerForWrong: 'P2' },
      { id: 'seq', type: 'sequence-sense', question: 'Order', principleOptions: ['Cause', 'Time'], orderingPrinciple: 'Time' },
      { id: 'multi', type: 'multi-select', question: 'Select', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'] }
    ] } };
    const d = deps(prompt => {
      const data = inputData(prompt);
      data.questions = data.questions.map(q => {
        const out = { ...q };
        for (const field of ['options', 'answerOptions', 'evidenceOptions', 'candidatePartners', 'principleOptions']) if (Array.isArray(q[field])) out[field] = q[field].map(value => 'DE ' + value);
        for (const key of ['correctAnswer', 'correctEvidence', 'correctPartnerForWrong', 'orderingPrinciple']) if (key in q) out[key] = 'WRONG';
        if (q.correctAnswers) out.correctAnswers = ['WRONG1', 'WRONG2'];
        return out;
      });
      return JSON.stringify(data);
    }, { translationMode: 'off' });
    const result = await translate(original, 'German', d);
    expect(result.data.questions[0]).toMatchObject({ correctAnswer: 'DE B', correctEvidence: 'DE E1' });
    expect(result.data.questions[1].correctPartnerForWrong).toBe('DE P2');
    expect(result.data.questions[2].orderingPrinciple).toBe('DE Time');
    expect(result.data.questions[3].correctAnswers).toEqual(['DE A', 'DE C']);
  });

  it('forwards cancellation and rejects a late reply after cancellation', async () => {
    const controller = new AbortController();
    const d = deps(() => { controller.abort(); return 'Late German text'; }, { generationSignal: controller.signal });
    await expect(translate(passage(), 'German', d)).rejects.toMatchObject({ name: 'AbortError' });
    expect(d.callGemini.mock.calls[0][5]).toBe(controller.signal);
  });
});
