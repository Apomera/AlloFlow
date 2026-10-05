import { beforeAll, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let View, api, KS;
beforeAll(() => {
 global.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
 window.AlloIcons = new Proxy({}, { get: () => () => null });
 loadAlloModule('instructional_context_module.js'); loadAlloModule('karaoke_audio_store_module.js');
 loadAlloModule('view_simplified_module.js');
 View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext; KS = window.AlloModules.KaraokeAudioStore;
});
function reading(language, help = 'a noble soldier.') {
 const resource = api.createSupportedReading(api.createSourceSnapshot('The knight arrived.', { language }), { id: 'support-inventory', sourceFamilyId: 'knights', config: { language } });
 resource.readingSupports = api.upsertReadingSupport(resource, undefined, { id: 'knight', start: 4, end: 10, quote: 'knight', text: help, kind: 'gloss', origin: 'educator' });
 return resource;
}
it.each(['English', 'Spanish', 'French', 'Arabic'])('matches the exact reader spoken label for %s', language => {
 const resource = reading(language, 'support?');
 const line = View.spokenSupportTemplate(language).split('{word}').join('knight').split('{support}').join('support?');
 const entries = View.enumerateNarrationSupportSegments(resource, { history: [resource], language });
 expect(entries.map(entry => entry.text)).toEqual(KS.splitSentences(line));
 expect(entries.every(entry => entry.scopeId === 'main' && entry.segmentId.startsWith('text/txt-'))).toBe(true);
});
it('excludes an invalid support anchored to another revision', () => {
 const resource = reading('English'); resource.data = 'The warrior arrived.';
 expect(View.enumerateNarrationSupportSegments(resource, { language: 'English' })).toEqual([]);
});
it('keeps main-only adapted readings separate from original labelled supports', () => {
 const resource = reading('English'); resource.instructionalText = { form: 'adapted', role: 'supplemental' };
 expect(View.enumerateNarrationSupportSegments(resource, { language: 'English' })).toEqual([]);
});

it('rejects stale supports after a genuine same-ID source-snapshot update', () => {
 const original = reading('English');
 const edited = api.createSupportedReading(api.createSourceSnapshot('The warrior arrived.', { language: 'English' }),
   { id: original.id, sourceFamilyId: original.sourceFamilyId, config: { language: 'English' } });
 edited.readingSupports = original.readingSupports;
 expect(api.isSupportedOriginal(edited)).toBe(true);
 expect(View.enumerateNarrationSupportSegments(edited, { language: 'English' })).toEqual([]);
});
