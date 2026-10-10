
  // Technique availability explains the native action gate and offers only
  // a focus handoff; the learner still supplies every plan and explanation.
  it('technique availability lets learners review a required plan without changing work', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState());
    try {
      const before = markingWorkProof(fixture.state);
      const instrument = fixture.state.activeInstrument;
      const feedback = fixture.state.procedureFeedback;
      const action = fixture.host.querySelector('.diss-procedure__next');
      const hint = fixture.host.querySelector('#diss-equivalent-technique-note');
      const link = fixture.host.querySelector('#diss-equivalent-checkpoint-link');
      expect(action.disabled).toBe(true);
      expect(hint.tagName).toBe('P');
      expect(hint.classList.contains('diss-sr-only')).toBe(false);
      expect(hint.textContent).toContain('Choose a safe plan');
      expect(action.getAttribute('aria-describedby')).toBe(hint.id);
      expect(link.textContent).toBe('Review plan');
      expect(link.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(link.getAttribute('aria-describedby')).toBe(hint.id);
      await clickEvidenceControl(link);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.state.activeInstrument).toBe(instrument);
      expect(fixture.state.procedureFeedback).toEqual(feedback);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability returns to the pending explanation before the next action', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } },
    }));
    try {
      const before = markingWorkProof(fixture.state);
      const action = fixture.host.querySelector('.diss-procedure__next');
      const link = fixture.host.querySelector('#diss-equivalent-checkpoint-link');
      expect(action.disabled).toBe(true);
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Explain the observed result');
      expect(link.textContent).toBe('Explain result');
      await clickEvidenceControl(link);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-learning-action')).toBe('inspect');
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-phase')).toBe('reflect');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability waits for the final native explanation before claiming completion', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('probe', {
      probed: true, history: [...actionHandoffOrder], cautionLog: [],
      tissueState: {
        ...actionHandoffTissue, consequences: [], lastAction: 'prepared', lastUpdatedAt: 100,
        variantId: 'firm', variantLabel: 'Firm preservation',
      },
    })));
    try {
      const before = markingWorkProof(fixture.state);
      const action = fixture.host.querySelector('.diss-procedure__next');
      expect(action.disabled).toBe(true);
      expect(action.textContent).toBe('Final explanation needed');
      expect(action.getAttribute('aria-label')).toBe('Final explanation needed. Complete the reflection checkpoint before continuing.');
      expect(action.getAttribute('aria-label')).not.toContain('protocol complete');
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Explain the observed result');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link').textContent).toBe('Explain result');
      const answer = Array.from(fixture.host.querySelectorAll('#diss-learning-checkpoint button')).find((button) =>
        button.textContent.includes('The visible boundary is traced and identified without increasing tissue stress.'));
      await clickEvidenceControl(answer);
      const completeAction = fixture.host.querySelector('.diss-procedure__next');
      expect(completeAction.disabled).toBe(true);
      expect(completeAction.textContent).toBe('Technique complete');
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Technique actions and explanations are complete');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(fixture.state.procedureByLayer.skin.learningChecks.probe.reflectionCorrect).toBe(true);
      const after = markingWorkProof(fixture.state);
      const beforeProcedure = before.procedureByLayer.skin;
      const afterProcedure = after.procedureByLayer.skin;
      expect({ ...afterProcedure, learningChecks: undefined }).toEqual({ ...beforeProcedure, learningChecks: undefined });
      expect({ ...after, procedureByLayer: undefined }).toEqual({ ...before, procedureByLayer: undefined });
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability explains a wrong instrument without selecting one automatically', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      learningChecks: { inspect: { predictionCorrect: true } },
    }, { activeInstrument: 'scalpel' }));
    try {
      const before = markingWorkProof(fixture.state);
      expect(fixture.host.querySelector('.diss-procedure__next').disabled).toBe(true);
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Select Probe in the instrument tray');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      expect(fixture.state.activeInstrument).toBe('scalpel');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability identifies a ready equivalent action while retaining the native action', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      learningChecks: { inspect: { predictionCorrect: true } },
    }));
    try {
      const action = fixture.host.querySelector('.diss-procedure__next');
      expect(action.disabled).toBe(false);
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Ready. This records a supported technique action');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      await clickEvidenceControl(action);
      expect(fixture.state.procedureByLayer.skin.inspected).toBe(true);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.reflectionCorrect).not.toBe(true);
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-phase')).toBe('reflect');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link').textContent).toBe('Explain result');
    } finally { await fixture.close(); }
  });

  it.each([
    ['guided investigation', { guidedMode: true }],
    ['practice assessment', { quizMode: true }],
    ['timed practical', { practicalMode: true, quizMode: true }],
    ['revealed layer', { revealedLayers: { skin: true } }],
    ['study tools', { toolbarStudyOpen: true }],
  ])('technique availability has no checkpoint handoff in %s', async (_case, patch) => {
    const activePatch = _case === 'timed practical' ? {
      ...patch, practicalTimer: 300, practicalEndsAt: Date.now() + 300000,
      practicalTargetIds: ['ventral_skin', 'tympanum'],
    } : patch;
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, activePatch));
    try {
      const before = markingWorkProof(fixture.state);
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });
