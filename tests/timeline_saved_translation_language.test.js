import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('timeline_revision_module.js');
});

describe('timeline revision saved companion language', () => {
  it.each(['Arabic', 'Spanish', null])('preserves the %s companion independently of current app settings', async target => {
    const targetLanguage = target || 'English';
    let resource = { id: 'timeline-' + targetLanguage, type: 'timeline', config: { language: 'French', translationTarget: target },
      data: { progressionLabel: 'Ordre', progressionLabel_en: 'Saved companion label', items: [
        { date: '1', event: 'Un événement', date_en: 'One', event_en: 'Saved translated event' },
      ] } };
    let history = [resource];
    const callGemini = vi.fn(async () => JSON.stringify({ progressionLabel: 'Ordre modifié', progressionLabel_en: 'Updated companion label',
      items: [{ date: '1', event: 'Autre événement', date_en: 'One', event_en: 'Updated translated event' }] }));
    const api = window.AlloModules.createTimelineRevision({ callGemini });
    await api.handleTimelineRevision({ input: 'Adjust wording', generatedContent: resource, includeTimelineVisuals: false,
      currentUiLanguage: 'Hebrew', translationMode: 'off', t: key => key, cleanJson: value => value, addToast: vi.fn(),
      setIsRevisingTimeline: vi.fn(), setTimelineRevisionInput: vi.fn(),
      setGeneratedContent: update => { resource = typeof update === 'function' ? update(resource) : update; },
      setHistory: update => { history = typeof update === 'function' ? update(history) : update; },
    });
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('"progressionLabel_en": "' + targetLanguage + ' translation"');
    expect(prompt).toContain('translations (date_en, event_en) in "' + targetLanguage + '"');
    expect(resource.config.translationTarget).toBe(target);
    expect(resource.data.items[0].event_en).toBe('Updated translated event');
    expect(history[0].data.items[0].event_en).toBe('Updated translated event');
  });
});
