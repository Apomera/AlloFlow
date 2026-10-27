/* Accessible independent responses shared by solo encounters and resumed runs. */
function ConceptQuestSoloQuestion({ item, response = {}, onChange, disabled, guideOpen, onGuideOpen, t }) {
  // Item text uses the Assess view's light markdown (Concept Quest opens from it); plain text without it.
  const cqMd = window.AlloModules?.QuizView?.markdown || { inline: v => v == null ? '' : String(v), block: v => v == null ? '' : String(v), plain: v => v == null ? '' : String(v) };
  const tr = (key, fallback) => { const value = t?.('concept_quest.' + key); return typeof value === 'string' && value !== 'concept_quest.' + key ? value : fallback; };
  const uid = React.useId();
  const update = patch => onChange({ ...response, ...patch });
  const type = item.type || 'mcq';
  const keyUnderReview = !!window.AlloModules.ConceptQuestSoloEngine.isAnswerKeyDisputed?.(item);
  const requiresReview = item.selfReviewRequired || keyUnderReview;
  const imageAlt = value => String(value == null ? '' : value).trim() || tr('solo_no_image_description', 'No visual description provided.');
  // Match the authored field names and legacy aliases used by Assess.
  const choiceSupport = field => {
    const stems = { options: 'option', answerOptions: 'answerOption', evidenceOptions: 'evidenceOption', items: 'item', candidatePartners: 'candidatePartner', principleOptions: 'principleOption' };
    const stem = stems[field] || field;
    return {
      translations: item[field + '_en'] || (field === 'answerOptions' ? item.options_en : null) || [],
      images: item[stem + 'ImageUrls'] || (field === 'answerOptions' ? item.answerImageUrls || item.optionImageUrls : field === 'evidenceOptions' ? item.evidenceImageUrls : field === 'principleOptions' ? item.principleOptionsImageUrls : null) || [],
      descriptions: item[stem + 'ImageAltTexts'] || (field === 'answerOptions' ? item.answerImageAltTexts || item.optionImageAltTexts : field === 'evidenceOptions' ? item.evidenceImageAltTexts : field === 'principleOptions' ? item.principleOptionsImageAltTexts : null) || [],
    };
  };
  const choiceContent = (field, index, text, prefix = '') => {
    const support = choiceSupport(field);
    return <span data-solo-choice-field={field} data-solo-choice-index={index} className="min-w-0 flex-1 break-words"><span>{prefix}{cqMd.inline(text)}</span>{support.translations[index] && <span className="mt-1 block text-sm font-normal italic opacity-80">{cqMd.inline(support.translations[index])}</span>}{support.images[index] && <img src={support.images[index]} alt={imageAlt(support.descriptions[index])} loading="lazy" className="my-2 max-h-48 w-full rounded bg-white object-contain"/>}</span>;
  };
  const optionLabel = (field, index, text) => cqMd.plain(text + (choiceSupport(field).translations[index] ? ' — ' + choiceSupport(field).translations[index] : ''));
  const selectSupports = field => {
    const support = choiceSupport(field);
    return ((Array.isArray(support.translations) && support.translations.some(Boolean)) || (Array.isArray(support.images) && support.images.some(Boolean))) ? <ol data-solo-choice-supports={field} className="mt-2 space-y-2">{(item[field] || []).map((text,index) => <li key={index} className="rounded-lg border border-slate-200 bg-white p-3">{choiceContent(field,index,text)}</li>)}</ol> : null;
  };
  const pairSide = (pair, index, side) => {
    pair = pair && typeof pair === 'object' ? pair : {};
    const translation = pair[side + '_en'] || item.pairs_en?.[index]?.[side];
    return <span data-solo-pair-side={side} className="min-w-0 flex-1 break-words"><span>{cqMd.inline(pair[side])}</span>{translation && <span className="mt-1 block text-sm font-normal italic opacity-80">{cqMd.inline(translation)}</span>}{pair[side + 'ImageUrl'] && <img src={pair[side + 'ImageUrl']} alt={imageAlt(pair[side + 'ImageAltText'])} loading="lazy" className="my-2 max-h-48 w-full rounded bg-white object-contain"/>}</span>;
  };
  const pairLabel = (pair, index) => {
    const left = pair.left_en || item.pairs_en?.[index]?.left, right = pair.right_en || item.pairs_en?.[index]?.right;
    return cqMd.plain(pair.left + ' / ' + pair.right + (left || right ? ' — ' + (left || pair.left) + ' / ' + (right || pair.right) : ''));
  };
  const choiceClass = selected => 'flex min-h-11 items-start gap-3 rounded-xl border-2 p-3 text-left ' + (selected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white');
  const textClass = 'min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:ring-4 focus:ring-indigo-200';
  const guide = window.AlloModules.ConceptQuestSoloEngine.answerGuide(item);
  const renderChoice = (option, index, field, name, sourceField) => <label key={index} className={choiceClass(response[field] === index)}><input type="radio" name={uid + name} checked={response[field] === index} onChange={() => update({ [field]: index })} className="mt-1"/>{choiceContent(sourceField, index, option, String.fromCharCode(65 + index) + '. ')}</label>;
  const pairs = Array.isArray(item.pairs) ? item.pairs : [];
  const orderItems = Array.isArray(item.items) ? item.items : [];
  const presented = Array.isArray(item.presentedOrder) && item.presentedOrder.length ? item.presentedOrder.map(entry => typeof entry === 'number' ? orderItems[entry] : entry) : orderItems;
  const presentedIndices = Array.isArray(item.presentedOrder) && item.presentedOrder.length === orderItems.length && item.presentedOrder.every(entry => Number.isInteger(entry) && entry >= 0 && entry < orderItems.length) ? item.presentedOrder : orderItems.map((_, index) => index);
  const arranged = Array.isArray(response.order) && response.order.length === orderItems.length ? response.order : presentedIndices;
  const moveStep = (position, delta) => { const target = position + delta; if (target < 0 || target >= arranged.length) return; const next = arranged.slice(); next[position] = arranged[target]; next[target] = arranged[position]; update({ order: next }); };
  const moveClass = 'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 disabled:opacity-40';
  const reviewChoices = (field, values) => Array.isArray(values) && values.length > 0 ? <ol data-solo-review-choices={field} className="space-y-2">{values.map((option,index) => <li key={index} className="rounded-lg border border-slate-300 bg-white p-3">{choiceContent(field,index,option,String.fromCharCode(65 + index) + '. ')}</li>)}</ol> : null;
  // A missing automatic key changes how the learner responds, not the material
  // they need to inspect. Keep the authored stimulus available for self-review.
  const reviewOrder = new Set(presentedIndices).size === orderItems.length ? presentedIndices : orderItems.map((_,index) => index);
  return <fieldset disabled={disabled} className="space-y-4" data-solo-question-type={type}>
    <legend className="mb-2 font-bold">{tr('solo_choose_answer', '2. Respond to the encounter')}</legend>
    <h4 id={uid + '-prompt'} className="break-words text-lg font-bold">{cqMd.inline(item.prompt || item.question)}</h4>
    {item.question_en && <p className="text-sm italic text-slate-600">{cqMd.inline(item.question_en)}</p>}
    {item.imageUrl && <img src={item.imageUrl} alt={imageAlt(item.imageAltText)} className="max-h-72 w-full rounded-xl bg-white object-contain"/>}
    {!requiresReview && type === 'mcq' && <div className="space-y-2">{(item.options || []).map((option,index) => renderChoice(option,index,'answerIndex','answer','options'))}</div>}
    {!requiresReview && type === 'multi-select' && <><p className="text-sm text-slate-600">{tr('solo_select_all', 'Select every answer that applies.')}</p><div className="space-y-2">{(item.options || []).map((option,index) => { const selected = (response.selectedIndices || []).includes(index); return <label key={index} className={choiceClass(selected)}><input type="checkbox" checked={selected} onChange={() => update({selectedIndices:selected ? response.selectedIndices.filter(value => value !== index) : [...(response.selectedIndices || []),index]})} className="mt-1"/>{choiceContent('options',index,option)}</label>; })}</div></>}
    {!requiresReview && (type === 'fill-blank' || type === 'numeric-response') && <>
      <label className="block text-sm font-semibold">{type === 'numeric-response' ? tr('solo_numeric_answer', 'Your value') : tr('solo_fill_answer', 'Complete the blank')}<input aria-describedby={uid + '-prompt'} inputMode={type === 'numeric-response' ? 'decimal' : undefined} value={response.text || ''} maxLength={4000} onChange={event => update({text:event.target.value})} className={textClass + ' mt-2'}/></label>
      {type === 'numeric-response' && <><label className="block text-sm font-semibold">{tr('solo_units', 'Units')}<input value={response.unit || ''} maxLength={100} onChange={event => update({unit:event.target.value})} className={textClass + ' mt-2'}/></label><p className="text-sm text-slate-600">{tr('solo_numeric_help', 'Enter a number, decimal, or fraction. Include units when the question requires them.')}</p>{response.text && !window.AlloModules.ConceptQuestSoloEngine.grade(item,response).complete && <p role="status" className="text-sm text-amber-900">{tr('solo_numeric_invalid', 'Check that the value is a valid number and that any units in both fields agree.')}</p>}</>}
    </>}
    {!requiresReview && type === 'sequence-sense' && <>
      <ol data-solo-presented-order className="list-inside list-decimal space-y-2 rounded-xl border border-slate-200 bg-white p-4">{presented.map((text,index) => <li key={index} className="break-words">{choiceContent('items',presentedIndices[index],text)}</li>)}</ol>
      <label className="block text-sm font-semibold">{tr('solo_sequence_check', 'Is this sequence in the correct order?')}<select value={response.verifyAnswer || ''} onChange={event => update({verifyAnswer:event.target.value,wrongIndex:null})} className={textClass + ' mt-2'}><option value="">{tr('solo_select_response', 'Choose a response')}</option><option value="yes">{tr('solo_yes', 'Yes')}</option><option value="no">{tr('solo_no', 'No')}</option></select></label>
      {response.verifyAnswer === 'no' && <label className="block text-sm font-semibold">{tr('solo_wrong_position', 'Which position needs correcting?')}<select value={response.wrongIndex ?? ''} onChange={event => update({wrongIndex:event.target.value === '' ? null : Number(event.target.value)})} className={textClass + ' mt-2'}><option value="">{tr('solo_select_position', 'Choose a position')}</option>{presented.map((text,index) => <option key={index} value={index}>{index + 1}. {optionLabel('items',presentedIndices[index],text)}</option>)}</select></label>}
      <div className="space-y-2"><p className="text-sm font-semibold">{tr('solo_arrange_order', 'Put the steps in the correct order. If they are already right, leave them.')}</p><ol aria-label={tr('solo_your_order', 'Your order')} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">{arranged.map((canonicalIndex, position) => <li key={canonicalIndex} className="flex items-center gap-2 break-words"><span className="w-6 flex-shrink-0 text-xs font-bold text-slate-600">{position + 1}.</span>{choiceContent('items',canonicalIndex,orderItems[canonicalIndex])}<button type="button" disabled={position === 0} aria-label={tr('solo_move_up', 'Move up') + ': ' + cqMd.plain(orderItems[canonicalIndex])} onClick={() => moveStep(position, -1)} className={moveClass}>▲</button><button type="button" disabled={position === arranged.length - 1} aria-label={tr('solo_move_down', 'Move down') + ': ' + cqMd.plain(orderItems[canonicalIndex])} onClick={() => moveStep(position, 1)} className={moveClass}>▼</button></li>)}</ol></div>
      <label className="block text-sm font-semibold">{tr('solo_ordering_reason', 'What principle determines the order?')}{Array.isArray(item.principleOptions) && item.principleOptions.length ? <select value={response.principleAnswer || ''} onChange={event => update({principleAnswer:event.target.value})} className={textClass + ' mt-2'}><option value="">{tr('solo_select_response', 'Choose a response')}</option>{item.principleOptions.map((option,index) => <option key={index} value={option}>{optionLabel('principleOptions',index,option)}</option>)}</select> : <input value={response.principleAnswer || ''} onChange={event => update({principleAnswer:event.target.value})} maxLength={2000} className={textClass + ' mt-2'}/>} </label>
      {selectSupports('principleOptions')}
    </>}
    {!requiresReview && type === 'relation-mismatch' && <>
      <ul className="space-y-2">{pairs.map((pair,index) => <li key={index} className="rounded-lg border border-slate-300 bg-white p-3">{index + 1}. <span data-solo-choice-field="pairs" data-solo-choice-index={index} className="flex min-w-0 items-start gap-2">{pairSide(pair,index,'left')}<span aria-hidden="true">↔</span>{pairSide(pair,index,'right')}</span></li>)}</ul>
      <label className="block text-sm font-semibold">{tr('solo_mismatch_pair', 'Which pair does not belong?')}<select value={response.pairIndex ?? ''} onChange={event => update({pairIndex:event.target.value === '' ? null : Number(event.target.value)})} className={textClass + ' mt-2'}><option value="">{tr('solo_select_pair', 'Choose a pair')}</option>{pairs.map((pair,index) => <option key={index} value={index}>{index + 1}. {pairLabel(pair,index)}</option>)}</select></label>
      <label className="block text-sm font-semibold">{tr('solo_correct_partner', 'Choose or write the correct partner')}{Array.isArray(item.candidatePartners) && item.candidatePartners.length ? <select value={response.partnerAnswer || ''} onChange={event => update({partnerAnswer:event.target.value})} className={textClass + ' mt-2'}><option value="">{tr('solo_select_response', 'Choose a response')}</option>{item.candidatePartners.map((partner,index) => <option key={index} value={partner}>{optionLabel('candidatePartners',index,partner)}</option>)}</select> : <input value={response.partnerAnswer || ''} onChange={event => update({partnerAnswer:event.target.value})} className={textClass + ' mt-2'}/>}</label>
      {selectSupports('candidatePartners')}
    </>}
    {!requiresReview && type === 'answer-evidence' && <><div role="group" aria-label={tr('solo_answer_part', 'Answer')} className="space-y-2">{(item.answerOptions || item.options || []).map((option,index) => renderChoice(option,index,'answerIndex','answer','answerOptions'))}</div><h5 className="font-bold">{cqMd.inline(item.evidencePrompt || tr('solo_evidence_part', 'Choose the evidence that supports your answer.'))}</h5>{item.evidencePrompt_en && <p className="text-sm italic text-slate-600">{cqMd.inline(item.evidencePrompt_en)}</p>}<div role="group" aria-label={tr('solo_evidence_label', 'Supporting evidence')} className="space-y-2">{(item.evidenceOptions || []).map((option,index) => renderChoice(option,index,'evidenceIndex','evidence','evidenceOptions'))}</div></>}
    {requiresReview && <>
      {keyUnderReview && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{tr('solo_key_under_review', 'This answer key is under review. Explain your reasoning and discuss it with your teacher; no answer is being marked correct.')}</p>}
      <div data-solo-review-stimulus className="space-y-4">
        {type !== 'answer-evidence' && reviewChoices('options',item.options)}
        {orderItems.length > 0 && <ol data-solo-presented-order className="list-inside list-decimal space-y-2 rounded-xl border border-slate-200 bg-white p-4">{reviewOrder.map((index,position) => <li key={position} className="break-words">{choiceContent('items',index,orderItems[index])}</li>)}</ol>}
        {Array.isArray(item.principleOptions) && item.principleOptions.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">{tr('solo_ordering_reason', 'What principle determines the order?')}</p>{reviewChoices('principleOptions',item.principleOptions)}</div>}
        {pairs.length > 0 && <ul className="space-y-2">{pairs.map((pair,index) => <li key={index} className="rounded-lg border border-slate-300 bg-white p-3">{index + 1}. <span data-solo-choice-field="pairs" data-solo-choice-index={index} className="flex min-w-0 items-start gap-2">{pairSide(pair,index,'left')}<span aria-hidden="true">↔</span>{pairSide(pair,index,'right')}</span></li>)}</ul>}
        {Array.isArray(item.candidatePartners) && item.candidatePartners.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">{tr('solo_correct_partner', 'Choose or write the correct partner')}</p>{reviewChoices('candidatePartners',item.candidatePartners)}</div>}
        {type === 'answer-evidence' && <><div role="group" aria-label={tr('solo_answer_part', 'Answer')} className="space-y-2">{reviewChoices('answerOptions',item.answerOptions || item.options)}</div><h5 className="font-bold">{cqMd.inline(item.evidencePrompt || tr('solo_evidence_part', 'Choose the evidence that supports your answer.'))}</h5>{item.evidencePrompt_en && <p className="text-sm italic text-slate-600">{cqMd.inline(item.evidencePrompt_en)}</p>}<div role="group" aria-label={tr('solo_evidence_label', 'Supporting evidence')} className="space-y-2">{reviewChoices('evidenceOptions',item.evidenceOptions)}</div></>}
      </div>
      <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950">{tr('solo_written_scope', 'Explain your reasoning, then compare it with the answer guide. This is a self-review checkpoint; it is not automatically graded and does not award correctness XP.')}</p>
      <label className="block text-sm font-semibold">{tr('solo_your_explanation', 'Your explanation')}<textarea value={response.text || ''} onChange={event => update({text:event.target.value,guideRevealed:false,selfReview:''})} rows={4} maxLength={4000} className={textClass + ' mt-2'}/></label>
      <button type="button" disabled={!(response.text || '').trim()} onClick={() => { update({guideRevealed:true}); onGuideOpen?.(true); }} className="min-h-11 rounded-lg border border-indigo-300 bg-white px-3 py-2 font-bold text-indigo-800 disabled:opacity-50">{tr('solo_compare_guide', 'Compare with answer guide')}</button>
      {guideOpen && response.guideRevealed && <><div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950" role="status"><strong>{tr('solo_answer_guide', 'Answer guide')}: </strong>{cqMd.inline(guide)}</div><label className="block text-sm font-semibold">{tr('solo_self_review_label', 'After comparing your explanation')}<select value={response.selfReview || ''} onChange={event => update({selfReview:event.target.value})} className={textClass + ' mt-2'}><option value="">{tr('solo_select_response', 'Choose a response')}</option><option value="understood">{tr('solo_understood', 'My explanation covers the key ideas')}</option><option value="needs-practice">{tr('solo_need_practice', 'I want more practice with this idea')}</option></select></label></>}
    </>}
  </fieldset>;
}
