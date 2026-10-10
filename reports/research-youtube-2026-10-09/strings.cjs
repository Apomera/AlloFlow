const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = {
  input: {
    research_read_video: 'Read video',
    research_video_link_only: 'No readable video transcript was returned.',
    research_video_snippet: 'Search snippet only; the video has not been transcribed.',
    research_video_ai_note: 'AI-linked notes, not a video transcript.',
    research_video_transcript_note: 'AI-generated transcript, not verified captions. It may contain transcription errors.',
    research_add_link: 'Add a link or your own text'
  },
  simplified: {
    sources_video_transcript: 'AI video transcript',
    sources_video_transcript_limit: 'AI-generated transcript, not verified captions. It may contain transcription errors.'
  }
};
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const name = path.join(root, file), catalog = JSON.parse(fs.readFileSync(name, 'utf8'));
  for (const [section, values] of Object.entries(delta)) Object.assign(catalog[section], values);
  fs.writeFileSync(name, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log('Registered eight research video labels.');
