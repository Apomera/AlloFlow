const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = { input: {
  research_transcript_apply_error: 'The excerpt selection could not be applied.',
  research_choose_transcript: 'Choose transcript excerpts',
  research_transcript_find: 'Find in transcript',
  research_transcript_selection: '{selected} of {capacity} excerpt slots selected',
  research_transcript_keep_one: 'Keep at least one excerpt, or remove this source.',
  research_transcript_source_excluded: 'This source remains excluded from writing.',
  research_transcript_keep: 'Keep excerpt {number}',
  research_transcript_no_matches: 'No matching excerpts.',
  research_transcript_previous: 'Previous excerpts',
  research_transcript_next: 'Next excerpts',
  research_transcript_page: 'Page {page} of {pages}',
  research_transcript_reset: 'Reset selection',
  research_transcript_apply: 'Apply excerpts',
  research_video_disabled: 'Video transcription is disabled in this session. You can paste a permitted transcript.',
  research_video_managed: 'This deployment does not allow video transcription. You can paste a permitted transcript.',
  research_video_provider: 'Video transcription requires Gemini. Your selected provider is unchanged; you can paste a transcript.',
  research_video_unavailable: 'The Gemini video reader is not ready. Reload the app or paste a transcript.',
  research_transcript_applied: 'Transcript excerpt selection updated.',
  research_transcript_reload: 'Load transcript for review',
  research_video_transcribing: 'Transcribing video with Gemini...',
  research_video_selecting: 'Selecting transcript excerpts...'
} };
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const name = path.join(root, file), catalog = JSON.parse(fs.readFileSync(name, 'utf8'));
  Object.assign(catalog.input, delta.input);
  fs.writeFileSync(name, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log('Registered ' + Object.keys(delta.input).length + ' transcript review labels.');
