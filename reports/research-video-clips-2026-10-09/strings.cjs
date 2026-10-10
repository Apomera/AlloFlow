const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const delta = {
  input: {
    research_requested_clip: 'Requested clip {start} to {end}',
    research_whole_video: 'Whole video',
    research_clip_unavailable: 'The video clip reader is not ready. Reload the app, or choose Whole video.',
    research_choose_clip: 'Choose clip',
    research_reload_clip: 'Load clip {start} to {end}',
    research_video_scope: 'Video range',
    research_clip: 'Clip',
    research_linked_start: 'Link starts at {time}. Whole video selected.',
    research_use_linked_start: 'Use linked start time',
    research_clip_start: 'Start time',
    research_clip_end: 'End time',
    research_clip_invalid: 'Enter a start and end time, with the end after the start.',
    research_read_clip: 'Read clip'
  },
  simplified: {
    sources_video_clip: 'Requested clip {start} to {end}',
    sources_open_clip_start: 'Open clip start'
  }
};
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const filename = path.join(root, file), catalog = JSON.parse(fs.readFileSync(filename, 'utf8'));
  for (const [section, entries] of Object.entries(delta)) Object.assign(catalog[section], entries);
  fs.writeFileSync(filename, JSON.stringify(catalog, null, 2) + '\n');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log('Registered 15 English clip labels.');
