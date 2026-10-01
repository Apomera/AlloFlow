// Exact edits to the isolated reader's long JSX line; never writes shared files.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'candidate/view_simplified_source.jsx');
let source = fs.readFileSync(file, 'utf8');
function once(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected one match: ' + before.slice(0, 90));
  source = source.replace(before, () => after);
}
once('style={simplifiedPopupStyle(revisionData, 18)}', 'style={simplifiedPopupStyle(revisionData, revisionPopupWidth)}');
once('revisionData.result ? renderSimplifiedPopupSpeaker(SIMPLIFIED_REVISION_AUDIO_ID, revisionData.result) : null', "revisionData.result && (!revisionNeedsPairReview || bilingualRevisionReview) ? renderSimplifiedPopupSpeaker(SIMPLIFIED_REVISION_AUDIO_ID, revisionData.result, selectedRevisionLanguage, bilingualRevisionReview ? viewText('simplified.revision.listen_selected', 'Listen to selected change') : undefined) : null");
const body = '<div className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100 mb-3">{renderFormattedText(revisionData.result, false)}</div>';
once(body, '{revisionNeedsPairReview ? renderBilingualRevisionReview() : ' + body + '}');
once('<button type="button" onClick={applyTextRevision}', '<button type="button" data-revision-apply disabled={revisionNeedsPairReview && !bilingualRevisionReview} onClick={applyTextRevision}');
once("{t('simplified.revision.replace_btn')}", "{revisionNeedsPairReview ? viewText('simplified.revision.apply_both', 'Apply both changes') : t('simplified.revision.replace_btn')}");
fs.writeFileSync(file, source);
console.log('Updated isolated bilingual review controls.');
