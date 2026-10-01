'use strict';
const fs = require('fs'), path = require('path');
const folder = path.join(__dirname, 'merge-track15-followup/resolved');
const re = /^<<<<<<< integrated\n([\s\S]*?)^\|\|\|\|\|\|\| incremental-base\n[\s\S]*?^=======\n([\s\S]*?)^>>>>>>> track15-followup\n/gm;
for (const file of ['AlloFlowANTI.txt', 'read_aloud_audio_service_source.jsx', 'view_simplified_source.jsx']) {
  const target = path.join(folder, file); let s = fs.readFileSync(target, 'utf8'), count = 0;
  s = s.replace(re, (_, current, incoming) => {
    const index = count++;
    if (file !== 'view_simplified_source.jsx' || index === 0) return current;
    if (index === 1) {
      const start = incoming.indexOf('    // Device durability');
      const end = incoming.indexOf('    var [studentPreview,');
      if (start < 0 || end < 0) throw Error('Missing device block');
      const split = current.indexOf('\n') + 1;
      return current.slice(0, split) + incoming.slice(start, end) + current.slice(split);
    }
    if (index === 2) return incoming;
    throw Error('Unexpected conflict');
  });
  if (count !== (file === 'AlloFlowANTI.txt' ? 2 : file === 'view_simplified_source.jsx' ? 3 : 1)) throw Error('Unexpected conflict count');
  if (file === 'view_simplified_source.jsx') {
    s = s.replace('deviceAudioResult.payload === generatedContent?.karaokeAudio ? deviceAudioResult.value', 'deviceAudioResult.payload === generatedContent?.karaokeAudio && deviceAudioResult.store === readAloudStore && deviceAudioResult.revision === readAloudStoreRevision ? deviceAudioResult.value');
    s = s.replace('setDeviceAudioResult({ context: ttsPrepContext, payload, value: result });', 'setDeviceAudioResult({ context: ttsPrepContext, payload, store: readAloudStore, revision: readAloudStoreRevision, value: result });');
    s = s.replace('[showReviewSummary, ttsPrepContext, generatedContent?.karaokeAudio, ttsPrepState.busy, ttsPrepFailure]);', '[showReviewSummary, ttsPrepContext, generatedContent?.karaokeAudio, ttsPrepState.busy, ttsPrepFailure, readAloudStore, readAloudStoreRevision, editAudioPlaybackErrors, audioStatusTick]);');
  }
  require('@babel/parser').parse(s, { sourceType: 'unambiguous', plugins: ['jsx'] });
  fs.writeFileSync(target, s);
}
