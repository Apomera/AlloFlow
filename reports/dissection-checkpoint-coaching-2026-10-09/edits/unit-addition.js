
  // Coaching stays associated with the native selected response. No retry
  // helper supplies an answer or substitutes for the learner's next choice.
  function checkpointCoachingProcedure(patch = {}) {
    return {
      ...actionHandoffProcedure('inspect'), cautionLog: [], learningChecks: {},
      tissueState: {
        ...actionHandoffTissue, consequences: [], lastAction: 'prepared', lastUpdatedAt: 100,
        variantId: 'firm', variantLabel: 'Firm preservation',
      },
      ...patch,
    };
  }

  function checkpointCoachingWorkProof(state) {
    const proof = markingWorkProof(state);
    proof.procedureByLayer = Object.fromEntries(Object.entries(proof.procedureByLayer || {}).map(([layer, procedure]) => {
      const { learningChecks, ...physical } = procedure;
      return [layer, physical];
    }));
    proof.activeInstrument = state.activeInstrument;
    return proof;
  }

  function expectSelectedCoaching(panel, button, feedbackId, nativeMessage) {
    const feedback = panel.querySelector('[id="' + feedbackId + '"]');
    expect(panel.querySelectorAll('[id="' + feedbackId + '"]')).toHaveLength(1);
    expect(button.parentElement.classList.contains('diss-learning-check__choice')).toBe(true);
    expect(button.nextElementSibling).toBe(feedback);
    expect(feedback.tagName).toBe('P');
    expect(feedback.getAttribute('data-result')).toBe('incorrect');
    expect(feedback.querySelector('.diss-learning-check__feedback-title').textContent.trim()).toBe('Try another choice.');
    expect(feedback.textContent).toContain(nativeMessage);
    expect(button.getAttribute('aria-describedby')).toBe(feedbackId);
    expect(button.textContent).not.toContain(nativeMessage);
    const others = Array.from(panel.querySelectorAll('.diss-learning-check__option')).filter((choice) => choice !== button);
    expect(others.every((choice) => !choice.hasAttribute('aria-describedby'))).toBe(true);
    return feedback;
  }

  it('checkpoint coaching follows repeated wrong plans without moving focus or recording a technique', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure()));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const choices = Array.from(panel.querySelectorAll('.diss-learning-check__option'));
      const answerText = choices.map((choice) => choice.querySelector('.diss-learning-check__answer').textContent);
      const before = checkpointCoachingWorkProof(fixture.state);
      const coaching = 'Look for the recommended view, planned route, and protected landmarks before contact.';
      choices[1].focus();
      await clickEvidenceControl(choices[1]);
      expect(document.activeElement).toBe(choices[1]);
      expect(panel.querySelectorAll('.diss-learning-check__option')[1]).toBe(choices[1]);
      const firstFeedback = expectSelectedCoaching(panel, choices[1], 'diss-learning-check-feedback', coaching);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'deep-view', predictionCorrect: false, predictionAttempts: 1 });
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      choices[2].focus();
      await clickEvidenceControl(choices[2]);
      expect(document.activeElement).toBe(choices[2]);
      expect(firstFeedback.isConnected).toBe(false);
      expectSelectedCoaching(panel, choices[2], 'diss-learning-check-feedback', coaching);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'tool-first', predictionCorrect: false, predictionAttempts: 2 });
      expect(choices.map((choice) => choice.querySelector('.diss-learning-check__answer').textContent)).toEqual(answerText);
      const beforeBrowsing = JSON.parse(JSON.stringify(fixture.state.procedureByLayer));
      await act(async () => { choices[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })); });
      expect(document.activeElement).toBe(choices[1]);
      expect(fixture.state.procedureByLayer).toEqual(beforeBrowsing);
      expectSelectedCoaching(panel, choices[2], 'diss-learning-check-feedback', coaching);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      choices[0].focus();
      await clickEvidenceControl(choices[0]);
      expect(panel.getAttribute('data-phase')).toBe('perform');
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'confirm-route', predictionCorrect: true, predictionAttempts: 3 });
      const confirmed = panel.querySelector('#diss-learning-check-feedback');
      expect(panel.querySelectorAll('#diss-learning-check-feedback')).toHaveLength(1);
      expect(confirmed.getAttribute('data-result')).toBe('correct');
      expect(confirmed.closest('.diss-learning-check__choice')).toBeNull();
      expect(confirmed.textContent).toContain('Plan confirmed.');
      expect(confirmed.textContent).not.toContain('Try another choice.');
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('checkpoint coaching keeps reflection feedback beside the chosen answer until native verification', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionChoice: 'confirm-route', predictionCorrect: true, reflectionCorrect: false } },
    })));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const choices = Array.from(panel.querySelectorAll('.diss-learning-check__option'));
      const before = checkpointCoachingWorkProof(fixture.state);
      choices[0].focus();
      await clickEvidenceControl(choices[0]);
      expect(document.activeElement).toBe(choices[0]);
      expectSelectedCoaching(panel, choices[0], 'diss-learning-check-feedback', 'Base the conclusion on view alignment and identifiable landmarks, not tool selection.');
      expect(panel.getAttribute('data-phase')).toBe('reflect');
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ reflectionChoice: 'largest-area', reflectionCorrect: false, reflectionAttempts: 1 });
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      choices[1].focus();
      await clickEvidenceControl(choices[1]);
      expect(panel.getAttribute('data-phase')).toBe('predict');
      expect(panel.getAttribute('data-learning-action')).toBe('scalpel');
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ reflectionChoice: 'aligned-landmarks', reflectionCorrect: true, reflectionAttempts: 2 });
      expect(panel.querySelector('#diss-learning-check-feedback')).toBeNull();
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  function checkpointCoachingGuidedState(feedback) {
    return techniqueRoadmapState(checkpointCoachingProcedure(), {
      guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'],
      guidedObservationPending: 'ventral_skin', guidedObservationFeedback: feedback,
    });
  }

  it('checkpoint coaching supports Guided retries without granting identification credit', async () => {
    const fixture = await mountMarkingFixture(checkpointCoachingGuidedState(null));
    try {
      const panel = fixture.host.querySelector('#diss-guided-observation-check');
      const choices = Array.from(panel.querySelectorAll('.diss-learning-check__option'));
      expect(choices).toHaveLength(3);
      const before = checkpointCoachingWorkProof(fixture.state);
      const coaching = 'That observation belongs to a different structure. Compare position, tissue appearance, and function, then try again.';
      choices[1].focus();
      await clickEvidenceControl(choices[1]);
      expect(document.activeElement).toBe(choices[1]);
      const firstFeedback = expectSelectedCoaching(panel, choices[1], 'diss-guided-observation-feedback', coaching);
      expect(fixture.state.guidedStep).toBe(0);
      expect(fixture.state.guidedObservationPending).toBe('ventral_skin');
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      choices[2].focus();
      await clickEvidenceControl(choices[2]);
      expect(document.activeElement).toBe(choices[2]);
      expect(firstFeedback.isConnected).toBe(false);
      expectSelectedCoaching(panel, choices[2], 'diss-guided-observation-feedback', coaching);
      const beforeBrowsing = JSON.parse(JSON.stringify(fixture.state.guidedObservationFeedback));
      await act(async () => { choices[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); });
      expect(document.activeElement).toBe(choices[0]);
      expect(fixture.state.guidedObservationFeedback).toEqual(beforeBrowsing);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
      await clickEvidenceControl(choices[0]);
      expect(fixture.host.querySelector('#diss-guided-observation-check')).toBeNull();
      expect(fixture.host.querySelector('#diss-guided-observation-feedback')).toBeNull();
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-canvas'));
      expect(fixture.state.guidedStep).toBe(1);
      expect(fixture.state.guidedObservationPending).toBeNull();
      expect(fixture.state.verifiedIdentifications['frog|ventral_skin'].status).toBe('verified');
      const after = checkpointCoachingWorkProof(fixture.state);
      expect({ ...after, selectedOrgan: before.selectedOrgan, verifiedIdentifications: before.verifiedIdentifications }).toEqual(before);
      expect(fixture.awardXP).toHaveBeenCalledTimes(1);
    } finally { await fixture.close(); }
  });

  it.each([
    ['missing', undefined],
    ['obsolete', 'retired-choice'],
  ])('checkpoint coaching retains saved feedback for a %s plan choice without inventing a selected answer', async (_case, savedChoice) => {
    const savedFeedback = 'Review the saved orientation response before trying again.';
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure({
      learningChecks: { inspect: { predictionChoice: savedChoice, predictionCorrect: false, predictionFeedback: savedFeedback } },
    })));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const before = checkpointCoachingWorkProof(fixture.state);
      const feedback = panel.querySelector('#diss-learning-check-feedback');
      expect(panel.querySelectorAll('#diss-learning-check-feedback')).toHaveLength(1);
      expect(feedback.textContent).toContain(savedFeedback);
      expect(feedback.closest('.diss-learning-check__choice')).toBeNull();
      expect(panel.querySelector('.diss-learning-check__option[aria-pressed="true"]')).toBeNull();
      expect(panel.querySelector('.diss-learning-check__option[aria-describedby]')).toBeNull();
      const correct = panel.querySelector('.diss-learning-check__option');
      await clickEvidenceControl(correct);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'confirm-route', predictionCorrect: true, predictionAttempts: 1 });
      expect(panel.getAttribute('data-phase')).toBe('perform');
      expect(panel.querySelectorAll('#diss-learning-check-feedback')).toHaveLength(1);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['empty', ''],
    ['non-string', { unsupported: true }],
  ])('checkpoint coaching leaves no dangling description for %s saved planning feedback', async (_case, savedFeedback) => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure({
      learningChecks: { inspect: { predictionChoice: 'deep-view', predictionCorrect: false, predictionFeedback: savedFeedback } },
    })));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const before = checkpointCoachingWorkProof(fixture.state);
      const choice = panel.querySelectorAll('.diss-learning-check__option')[1];
      expect(choice.getAttribute('aria-pressed')).toBe('true');
      expect(choice.hasAttribute('aria-describedby')).toBe(false);
      expect(panel.querySelector('#diss-learning-check-feedback')).toBeNull();
      choice.focus();
      await clickEvidenceControl(choice);
      expect(document.activeElement).toBe(choice);
      expectSelectedCoaching(panel, choice, 'diss-learning-check-feedback', 'Look for the recommended view, planned route, and protected landmarks before contact.');
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.predictionAttempts).toBe(1);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.predictionCorrect).toBe(false);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('checkpoint coaching retains unmatched Guided feedback until a native response is selected', async () => {
    const savedFeedback = 'Review the previous observation against the current specimen.';
    const fixture = await mountMarkingFixture(checkpointCoachingGuidedState({ correct: false, choiceId: 'retired-structure', message: savedFeedback }));
    try {
      const panel = fixture.host.querySelector('#diss-guided-observation-check');
      const before = checkpointCoachingWorkProof(fixture.state);
      const feedback = panel.querySelector('#diss-guided-observation-feedback');
      expect(panel.querySelectorAll('#diss-guided-observation-feedback')).toHaveLength(1);
      expect(feedback.textContent).toContain(savedFeedback);
      expect(feedback.closest('.diss-learning-check__choice')).toBeNull();
      expect(panel.querySelector('.diss-learning-check__option[aria-describedby]')).toBeNull();
      const wrong = panel.querySelectorAll('.diss-learning-check__option')[1];
      wrong.focus();
      await clickEvidenceControl(wrong);
      expect(document.activeElement).toBe(wrong);
      expect(feedback.isConnected).toBe(false);
      expectSelectedCoaching(panel, wrong, 'diss-guided-observation-feedback', 'That observation belongs to a different structure.');
      expect(fixture.state.guidedStep).toBe(0);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['empty', ''],
    ['non-string', { unsupported: true }],
  ])('checkpoint coaching leaves no dangling description for %s Guided feedback', async (_case, savedFeedback) => {
    const fixture = await mountMarkingFixture(checkpointCoachingGuidedState({ correct: false, choiceId: 'ventral_skin', message: savedFeedback }));
    try {
      const panel = fixture.host.querySelector('#diss-guided-observation-check');
      const before = checkpointCoachingWorkProof(fixture.state);
      const choices = panel.querySelectorAll('.diss-learning-check__option');
      expect(choices[0].getAttribute('aria-pressed')).toBe('true');
      expect(choices[0].hasAttribute('aria-describedby')).toBe(false);
      expect(panel.querySelector('#diss-guided-observation-feedback')).toBeNull();
      choices[1].focus();
      await clickEvidenceControl(choices[1]);
      expect(document.activeElement).toBe(choices[1]);
      expectSelectedCoaching(panel, choices[1], 'diss-guided-observation-feedback', 'That observation belongs to a different structure.');
      expect(fixture.state.guidedStep).toBe(0);
      expect(fixture.state.guidedObservationPending).toBe('ventral_skin');
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });
