const fs=require('fs');let p='story_forge_source.jsx';let s=fs.readFileSync(p,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replace(a,b);}
replace('const prepareStoryForgeLessonImport = (resource) => {',`// Validate service output before it reaches JSX or marks a draft reviewed.
const normalizeStoryForgeFeedback = (value) => {
  const text = (v, limit, required = true) => {
    if (typeof v !== 'string' || (required && !v.trim())) throw new Error('Invalid feedback text');
    return v.trim().slice(0, limit);
  };
  if (!value || !Array.isArray(value.scores) || !value.scores.length || value.scores.length > 32) throw new Error('Invalid feedback scores');
  const seen = new Set();
  let total = 0;
  const scores = value.scores.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid criterion');
    const criteria = text(item.criteria, 200);
    const key = criteria.normalize('NFKC').toLowerCase();
    if (seen.has(key)) throw new Error('Duplicate criterion');
    seen.add(key);
    const match = typeof item.score === 'string' && item.score.trim().match(/^(\\d+(?:\\.\\d+)?)\\s*\\/\\s*5$/);
    const score = typeof item.score === 'number' ? item.score : match ? Number(match[1]) : NaN;
    if (!Number.isFinite(score) || score < 0 || score > 5) throw new Error('Invalid criterion score');
    total += score;
    return { criteria, score: score + '/5', comment: item.comment == null ? '' : text(item.comment, 2000, false) };
  });
  const feedback = { glow: text(value.feedback?.glow, 4000), grow: text(value.feedback?.grow, 4000) };
  if (value.vocabScores != null && (!Array.isArray(value.vocabScores) || value.vocabScores.length > 64)) throw new Error('Invalid vocabulary feedback');
  const vocabScores = (value.vocabScores || []).map(item => {
    if (!item || !['correct', 'partial', 'missing'].includes(item.status)) throw new Error('Invalid vocabulary status');
    return { term: text(item.term, 160), status: item.status, comment: item.comment == null ? '' : text(item.comment, 2000, false) };
  });
  return { scores, totalScore: Number(total.toFixed(2)) + '/' + (scores.length * 5), feedback, vocabScores };
};

const prepareStoryForgeLessonImport = (resource) => {`);
replace('  const [gradingResult, setGradingResult] = useState(null);',`  const [gradingResult, setGradingResult] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const feedbackRequestRef = useRef(0);
  const feedbackBusyRef = useRef(false);
  const feedbackStateRef = useRef(null);
  useEffect(() => () => { feedbackRequestRef.current += 1; }, []);
  const cancelFeedback = () => {
    feedbackRequestRef.current += 1;
    feedbackBusyRef.current = false;
    setFeedbackLoading(false);
    setIsProcessing(false);
    const message = ux('feedback_cancelled', 'Feedback cancelled. You can retry or complete your self-check.');
    setFeedbackNotice(message);
    sfAnnounce(message);
  };`);
replace('  const [draftCount, setDraftCount] = useState(1);',`  const [draftCount, setDraftCount] = useState(1);
  feedbackStateRef.current = useMemo(() => ({}), [isOpen, SAVE_KEY, currentReviewDraftSignature, gradeLevel, sourceTopic, draftCount]);`);
replace('  const clearReviewState = () => {','  const clearReviewState = () => {\n    setFeedbackNotice(\'\');');
replace('  const gradeStory = async () => {\n    if (!onCallGemini) { notifyAiUnavailable(); return; }\n    setIsProcessing(true);',`  const gradeStory = async () => {
    if (!onCallGemini) { notifyAiUnavailable(); return; }
    if (feedbackBusyRef.current || projectMutationBusyRef.current) return;
    const requestId = ++feedbackRequestRef.current;
    const requestState = feedbackStateRef.current;
    feedbackBusyRef.current = true;
    setFeedbackLoading(true);
    setFeedbackNotice('');
    setIsProcessing(true);`);
const start=s.indexOf('  const gradeStory = async () => {');const end=s.indexOf('\n  const reviseStory',start);let block=s.slice(start,end);
block=block.replace('      const data = JSON.parse(cleanJson(result));',`      if (requestId !== feedbackRequestRef.current) return;
      if (requestState !== feedbackStateRef.current) {
        const message = ux('feedback_changed', 'Your draft changed while feedback was being prepared. Get feedback again for the latest version, or complete your self-check.');
        setFeedbackNotice(message);
        sfAnnounce(message);
        return;
      }
      const data = normalizeStoryForgeFeedback(JSON.parse(cleanJson(result)));`);
block=block.replace("      console.warn('Grading failed:', err);",`      if (requestId !== feedbackRequestRef.current) return;
      const message = ux('feedback_failed', 'Feedback could not be prepared. Your writing is safe. Retry or complete your self-check to continue.');
      setFeedbackNotice(message);
      sfAnnounce(message);
      console.warn('Grading failed:', err);`);
block=block.replace('    }\n    setIsProcessing(false);',`    } finally {
      if (requestId === feedbackRequestRef.current) {
        feedbackBusyRef.current = false;
        setFeedbackLoading(false);
        setIsProcessing(false);
      }
    }`);s=s.slice(0,start)+block+s.slice(end);
replace("{isProcessing ? 'Grading...' : 'Get Feedback'}","{feedbackLoading ? 'Preparing feedback...' : 'Get Feedback'}");
replace('              {/* ═══ Pre-grade Self-Assessment ═══ */}',`              {feedbackLoading && (
                <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-sm text-indigo-900">{ux('feedback_working', 'Preparing feedback for this draft. You can cancel and keep writing.')}</p>
                  <button type="button" data-sf-cancel-feedback onClick={cancelFeedback} className="mt-2 min-h-11 rounded-lg border border-indigo-400 bg-white px-4 py-2 text-sm font-bold text-indigo-900">{ux('cancel_feedback', 'Cancel feedback')}</button>
                </div>
              )}
              {feedbackNotice && !feedbackLoading && (
                <div data-sf-feedback-notice role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-sm text-indigo-900">{feedbackNotice}</p>
                  <button type="button" onClick={gradeStory} disabled={!onCallGemini || isProcessing} className="mt-2 min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{ux('retry_feedback', 'Retry feedback')}</button>
                </div>
              )}
              {/* ═══ Pre-grade Self-Assessment ═══ */}`);
// Review's large spinner should describe feedback, rather than unrelated AI operations.
const review=s.indexOf('          {/* ═══ REVIEW PHASE ═══ */}');s=s.slice(0,review)+s.slice(review).replace('{isProcessing && !gradingResult && (','{feedbackLoading && !gradingResult && (');
fs.writeFileSync(p,s);
p='_build_story_forge_module.js';s=fs.readFileSync(p,'utf8').replace('_meta = { prepareStoryForgeLessonImport','_meta = { normalizeStoryForgeFeedback, prepareStoryForgeLessonImport');fs.writeFileSync(p,s);
const labels={feedback_cancelled:'Feedback cancelled. You can retry or complete your self-check.',feedback_changed:'Your draft changed while feedback was being prepared. Get feedback again for the latest version, or complete your self-check.',feedback_failed:'Feedback could not be prepared. Your writing is safe. Retry or complete your self-check to continue.',feedback_working:'Preparing feedback for this draft. You can cancel and keep writing.',cancel_feedback:'Cancel feedback',retry_feedback:'Retry feedback'};
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){const data=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(data.storyforge_updates,labels);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
