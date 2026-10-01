// One-time, exact substitutions in the isolated candidate's long JSX lines.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'candidate/view_simplified_source.jsx');
let source = fs.readFileSync(file, 'utf8');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected one match: ' + before.slice(0, 80));
  source = source.replace(before, () => after);
}
replaceOnce('comparisonKaraoke && isCompareMode && KaraokeReaderOverlay &&', 'comparisonKaraoke && comparisonKaraoke.scope === listenAlongScope && !isEditingLeveledText && !props.isStudentPreview && KaraokeReaderOverlay &&');
replaceOnce('onClose={() => setComparisonKaraoke(null)}', 'onClose={closeListenAlong}');
replaceOnce('disabled={!version.text || !KaraokeReaderOverlay}', 'disabled={!!props.isStudentPreview || !version.text || !KaraokeReaderOverlay}');
replaceOnce(`onClick={() => {
            if (typeof stopPlayback === 'function') stopPlayback();
            var entries = getReadAloudSentenceEntriesForText(version.text, version.language || readingLanguage);
            setComparisonKaraoke({ text: version.text, language: version.language || readingLanguage, entries, sentences: entries.map(entry => entry.text), languages: entries.map(entry => simplifiedLanguageTag(entry.language)) });
          }}`, `onClick={event => openListenAlong(version.text, version.language || readingLanguage, event)}`);
const marker = '<button type="button" aria-label={readerText(\'simplified.immersive_reader\', \'Immersive Reader\')}';
const control = `{!isCompareMode && <button type="button" data-reader-listen-along aria-describedby={props.isStudentPreview ? props.previewLimitId : undefined} disabled={!!props.isStudentPreview || isEditingLeveledText || !KaraokeReaderOverlay || !listenAlongEntries.length} onClick={event => openListenAlong(simplifiedReadAloudText, readingLanguage, event)} className="min-h-11 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"><Volume2 size={16} aria-hidden="true" />{readerText('simplified.listen_along', 'Listen along')}</button>}`;
replaceOnce(marker, control + marker);
fs.writeFileSync(file, source);
console.log('Updated isolated karaoke controls.');
