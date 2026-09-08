const fs=require('fs');let p='story_forge_source.jsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('{!gradingResult && selfAssessmentSubmitted && !isCurrentDraftReviewed && (','{!gradingResult && selfAssessmentSubmitted && !isCurrentDraftReviewed && !feedbackNotice && !feedbackLoading && (');
const needle="{ux('retry_feedback', 'Retry feedback')}</button>";
if(!s.includes(needle))throw Error('retry missing');
s=s.replace(needle,needle+`
                  {!isCurrentDraftReviewed && <button type="button" onClick={() => { setSelfAssessmentSubmitted(false); setFeedbackNotice(''); }} className="mt-2 ml-2 min-h-11 rounded-lg border border-indigo-400 bg-white px-4 py-2 text-sm font-bold text-indigo-900">{ux('return_selfcheck', 'Return to self-check')}</button>}`);
fs.writeFileSync(p,s);
