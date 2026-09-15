  const renderReview = () => {
    const model = appliedChallengeExportModel(data, { t });
    const items = appliedChallengeReviewItems(data);
    const editStage = index => { setFocusMode(true); goToStage(index); };
    const recorded = tx('applied_challenge.review.recorded', 'Recorded');
    const missing = tx('applied_challenge.review.missing', 'Not recorded');
    return <section aria-labelledby='aps-review-heading'>
      <h2 id='aps-review-heading' tabIndex={-1} className='text-xl font-bold'>{tx('applied_challenge.review.heading', 'Review my response')}</h2>
      <p className='mt-2 text-sm text-slate-600'>{tx('applied_challenge.review.coverage_note', 'These checks show what you recorded, not a grade. Open any part to add to it or revise it. Your work is not submitted from this review.')}</p>
      <ul className='mt-4 grid gap-2 sm:grid-cols-2' aria-label={tx('applied_challenge.review.coverage', 'Parts of my reasoning')}>
        {items.map(item => <li key={item.id}><button type='button' className='aps-review-item' onClick={() => editStage(item.stage)}><span className='font-semibold'>{tx('applied_challenge.review.part.' + item.id, item.label)}</span><span className={item.recorded ? 'text-emerald-800' : 'text-slate-600'}>{item.recorded ? recorded : missing}</span></button></li>)}
      </ul>
      {!appliedChallengeHasResponse(data.workspace) && <p role='status' className='mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950'>{tx('applied_challenge.review.no_response', 'Add a written response, or a link to your work with an explanation of its reasoning, in Build.')}</p>}
      {APPLIED_CHALLENGE_STAGES.map((stage, index) => {
        const fields = visiblePhases.filter(item => stage.phases.includes(item.id) && data.workspace[item.id].trim());
        const linkedWork = stage.id === 'build' && (model.artifactUrl || model.artifactDescription);
        if (!fields.length && !linkedWork) return null;
        return <section key={stage.id} className='mt-5 border-t border-slate-200 pt-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'><h3 className='text-base font-bold'>{stageLabel(stage)}</h3><button type='button' className='aps-button' onClick={() => editStage(index)}>{_apsFill(tx('applied_challenge.review.edit', 'Edit {stage}'), { stage: stageLabel(stage) })}</button></div>
          {fields.map(item => <section key={item.id} className='mt-3'><h4 className='text-sm font-bold'>{appliedChallengePhaseLabel(item, data.family, t).replace(/^\d+\.\s*/, '')}</h4><p className='mt-1 whitespace-pre-wrap text-sm'>{data.workspace[item.id]}</p></section>)}
          {linkedWork && <section className='mt-3'><h4 className='text-sm font-bold'>{tx('applied_challenge.review.linked', 'Linked work and explanation')}</h4>{model.artifactUrl && <a href={model.artifactUrl} target='_blank' rel='noopener noreferrer' className='mt-2 block underline'>{tx('applied_challenge.artifact.open', 'Open my linked work')}</a>}<p className='mt-2 whitespace-pre-wrap text-sm'>{model.artifactDescription}</p></section>}
        </section>;
      })}
      {model.evidenceLedger.length > 0 && <section className='mt-5 border-t border-slate-200 pt-4' aria-label={tx('applied_challenge.review.evidence', 'My evidence connections')}><h3 className='text-base font-bold'>{tx('applied_challenge.review.evidence', 'My evidence connections')}</h3>{model.evidenceLedger.map((row, index) => <article key={row.id} className='mt-3 rounded-xl border border-slate-200 p-3'><h4 className='text-sm font-bold'>{row.claim || _apsFill(tx('applied_challenge.ledger.row', 'Evidence row {n}'), { n: index + 1 })}</h4><p className='mt-2 whitespace-pre-wrap text-sm'>{row.evidence}</p>{row.sourceText && <p className='mt-2 text-sm'><strong>{tx('applied_challenge.export.source_fact', 'Linked lesson fact:')}</strong> {row.sourceText}</p>}<p className='mt-2 text-sm text-slate-600'>{row.statusLabel}</p>{row.tradeoff && <p className='mt-2 whitespace-pre-wrap text-sm'><strong>{tx('applied_challenge.ledger.tradeoff', 'Tradeoff, constraint, or uncertainty')}:</strong> {row.tradeoff}</p>}</article>)}</section>}
      {model.validationCycles.length > 0 && <section className='mt-5 border-t border-slate-200 pt-4' aria-label={tx('applied_challenge.review.checks', 'My detailed checks')}><h3 className='text-base font-bold'>{tx('applied_challenge.review.checks', 'My detailed checks')}</h3>{model.validationCycles.map((cycle, index) => <article key={cycle.id} className='mt-3 rounded-xl border border-slate-200 p-3'><h4 className='text-sm font-bold'>{index + 1}. {cycle.sourceLabel}</h4>{cycle.source === 'ai' && <p className='mt-2 whitespace-pre-wrap text-sm'>{cycle.dispositionLabel}: {cycle.dispositionReason}</p>}<dl className='mt-2 space-y-2 text-sm'>{[
        [tx('applied_challenge.export.planned', 'Planned check:'), cycle.plan.testQuestion],
        [tx('applied_challenge.export.threshold', 'What could change my mind:'), cycle.plan.changeThreshold],
        [tx('applied_challenge.export.observed', 'Reported observation:'), cycle.observation.evidence],
        [tx('applied_challenge.review.decision', 'My decision and reason'), [cycle.decision.actionLabel, cycle.decision.reasoning, cycle.decision.revisionSummary].filter(Boolean).join('\n')],
      ].map(([label, text]) => <div key={label}><dt className='font-bold'>{label}</dt><dd className='whitespace-pre-wrap'>{text || missing}</dd></div>)}</dl></article>)}</section>}
      {model.selfCheck.length > 0 && details(tx('applied_challenge.review.criteria', 'My criteria notes and ratings'), <><p className='text-sm text-slate-600'>{tx('applied_challenge.review.self_ratings', 'These are your own ratings. Check that each note supports the rating.')}</p>{model.selfCheck.map(row => <article key={row.key} className='rounded-xl border border-slate-200 p-3'><h3 className='text-sm font-bold'>{row.text}</h3><p className='mt-1 text-sm'>{row.ratingLabel}</p>{row.needsReview && <p className='mt-1 text-sm text-amber-900'>{tx('applied_challenge.self_check.changed', 'This requirement changed. Review your earlier note before rating it again.')}</p>}<p className='mt-1 whitespace-pre-wrap text-sm'>{row.note}</p></article>)}</>)}
      {renderFeedback()}
      <button type='button' onClick={() => editStage(2)} className='aps-button mt-5'>{tx('applied_challenge.review.return', 'Return to my draft')}</button>
    </section>;
  };
