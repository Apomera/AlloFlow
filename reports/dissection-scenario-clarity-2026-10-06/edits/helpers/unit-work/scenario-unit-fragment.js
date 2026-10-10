  function scenarioSessionWorkProof(state) {
    return JSON.parse(JSON.stringify({
      ...studyChooserWorkProof(state),
      activeInstrument: state.activeInstrument, procedureMode: state.procedureMode,
      procedureScenario: state.procedureScenario, scenarioStartedAt: state.scenarioStartedAt,
      scenarioTimeRemaining: state.scenarioTimeRemaining, scenarioCompletedAt: state.scenarioCompletedAt,
      relationshipTraceIndex: state.relationshipTraceIndex, relationshipTraceCount: state.relationshipTraceCount,
      compareTechniqueAttempts: state.compareTechniqueAttempts,
      labelMode: state.labelMode, highContrast: state.highContrast, reducedMotion: state.reducedMotion,
      largeText: state.largeText, simplifiedInstructions: state.simplifiedInstructions,
    }));
  }

  function queuedScenarioConfirmation(button) {
    expect(button).not.toBeNull();
    // Retain the actual mounted handler to model a queued click from an old
    // review. Clicking a detached node would bypass React event delegation and
    // would never exercise the stale-callback guard.
    const propsKey = Object.keys(button).find((key) => key.startsWith('__reactProps$'));
    expect(propsKey).toBeDefined();
    const handler = button[propsKey].onClick;
    expect(typeof handler).toBe('function');
    return async () => {
      await act(async () => { handler({ currentTarget: button, preventDefault() {}, stopPropagation() {} }); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    };
  }

  it('distinguishes an unstarted four-minute technique challenge and starts the native clock on the current attempt without resetting work', async () => {
    const now = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: 0,
        scenarioTimeRemaining: 125, scenarioCompletedAt: 0, techniquePanelOpen: true,
      });
      const before = scenarioSessionWorkProof(fixture.state);
      const panel = fixture.host.querySelector('.diss-scenario-console');
      expect(panel.textContent).toContain('4-minute technique challenge');
      expect(panel.querySelector('.diss-scenario-console__state').getAttribute('data-state')).toBe('not-started');
      expect(panel.querySelector('#diss-scenario-time')).toBeNull();
      expect(panel.querySelector('[role="timer"]')).toBeNull();
      const start = panel.querySelector('#diss-scenario-start');
      expect(start.disabled).toBe(false);
      const helpIds = start.getAttribute('aria-describedby').split(/\s+/);
      expect(helpIds.length).toBeGreaterThan(0);
      for (const id of helpIds) expect(panel.querySelector('[id="' + id + '"]').textContent.trim().length).toBeGreaterThan(0);
      await clickEvidenceControl(start);
      expect(fixture.state.procedureScenario).toBe('timed-practical');
      expect(fixture.state.scenarioStartedAt).toBe(now);
      expect(fixture.state.scenarioTimeRemaining).toBe(240);
      expect(fixture.state.scenarioCompletedAt).toBe(0);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual({
        ...before, scenarioStartedAt: now, scenarioTimeRemaining: 240, scenarioCompletedAt: 0,
      });
      expect(panel.querySelector('.diss-scenario-console__state').getAttribute('data-state')).toBe('active');
      expect(panel.querySelectorAll('[role="timer"]')).toHaveLength(1);
      expect(panel.querySelector('#diss-scenario-time').getAttribute('aria-live')).toBe('off');
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it('uses the real expired deadline despite a stale positive counter and opens challenge recovery without resetting the attempt', async () => {
    const now = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: now - 241000,
        scenarioTimeRemaining: 125, scenarioCompletedAt: 0, techniquePanelOpen: false,
      });
      const before = scenarioSessionWorkProof(fixture.state);
      const next = fixture.host.querySelector('[data-dissection-next-action]');
      expect(next.getAttribute('data-next-action')).toBe('scenario-recovery');
      const primary = next.querySelector('#diss-next-action-primary');
      expect(primary.textContent).toBe('Review challenge recovery');
      await clickEvidenceControl(primary);
      expect(fixture.state.techniquePanelOpen).toBe(true);
      const panel = fixture.host.querySelector('.diss-scenario-console');
      expect(panel.querySelector('.diss-scenario-console__state').getAttribute('data-state')).toBe('expired');
      const timer = panel.querySelector('#diss-scenario-time');
      expect(timer.textContent).toMatch(/0:00|0 seconds/);
      expect(timer.getAttribute('aria-live')).toBe('off');
      expect(fixture.state.scenarioTimeRemaining).toBe(125);
      expect(panel.querySelector('#diss-scenario-start')).toBeNull();
      const restart = panel.querySelector('#diss-scenario-restart');
      expect(document.activeElement).toBe(restart);
      expect(panel.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(restart);
      expect(panel.querySelector('#diss-scenario-restart-review')).not.toBeNull();
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(panel.querySelector('#diss-scenario-restart-cancel'));
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it('keeps native completed-challenge time frozen with one quiet timer after the deadline passes', async () => {
    const startedAt = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(startedAt + 241000);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: startedAt,
        scenarioTimeRemaining: 125, scenarioCompletedAt: startedAt + 115000, techniquePanelOpen: true,
        procedureByLayer: { skin: {
          inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
          pins: [{ x: 0.42, y: 0.36 }, { x: 0.58, y: 0.64 }], probed: true,
          history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'],
        } },
      });
      const before = scenarioSessionWorkProof(fixture.state);
      const panel = fixture.host.querySelector('.diss-scenario-console');
      const state = panel.querySelector('.diss-scenario-console__state');
      expect(state.getAttribute('data-state')).toBe('complete');
      expect(panel.querySelectorAll('[role="timer"]')).toHaveLength(1);
      const timer = panel.querySelector('#diss-scenario-time');
      expect(timer.textContent).toMatch(/2:05|2 minutes 5 seconds/);
      expect(timer.getAttribute('aria-live')).toBe('off');
      expect(timer.closest('[aria-live="polite"], [aria-live="assertive"]')).toBeNull();
      const text = timer.textContent;
      clock.mockReturnValue(startedAt + 600000);
      await fixture.patch({ procedureFeedback: { message: 'Reviewing recorded technique.', tone: 'working', at: startedAt + 600000 } });
      expect(state.getAttribute('data-state')).toBe('complete');
      expect(timer.textContent).toBe(text);
      expect(fixture.host.querySelector('[data-dissection-next-action]').getAttribute('data-next-action')).not.toBe('scenario-recovery');
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it('reviews scenario restart consequences and cancels through its native button or Escape without changing learner work', async () => {
    const fixture = await mountMarkingFixture({ revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'precision-access' });
    try {
      const before = scenarioSessionWorkProof(fixture.state);
      const restart = fixture.host.querySelector('#diss-scenario-restart');
      await clickEvidenceControl(restart);
      let review = fixture.host.querySelector('#diss-scenario-restart-review');
      expect(review.getAttribute('role')).toBe('group');
      expect(review.getAttribute('tabindex')).toBe('-1');
      expect(review.getAttribute('aria-labelledby')).toBe('diss-scenario-restart-title');
      expect(review.getAttribute('aria-describedby')).toBe('diss-scenario-restart-effects');
      const warning = review.querySelector('#diss-scenario-restart-effects').textContent;
      expect(warning).toMatch(/technique/i);
      expect(warning).toMatch(/inspect/i);
      expect(warning).toMatch(/specimen/i);
      expect(document.activeElement).toBe(review.querySelector('#diss-scenario-restart-cancel'));
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(review.querySelector('#diss-scenario-restart-cancel'));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(document.activeElement).toBe(restart);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(restart);
      review = fixture.host.querySelector('#diss-scenario-restart-review');
      await act(async () => { review.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(document.activeElement).toBe(restart);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('confirms exactly the native restart scope while retaining updated notes, other layers, other specimens, frames and archived attempts', async () => {
    const now = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'timed-practical',
        scenarioStartedAt: now - 50000, scenarioTimeRemaining: 190, scenarioCompletedAt: 0,
        exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'pig|heart': true },
        procedureByLayer: {
          skin: { inspected: true, incisionStarted: true, history: ['inspect', 'scalpel'], actionLog: [{ action: 'inspect', at: 50 }], errors: 2,
            tissueState: { clarity: 32, moisture: 78, stability: 44, risk: 48 } },
          organs: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 60 }] },
        },
        attemptArchive: { skin: [{ id: 7, score: 80, history: ['inspect'], actionLog: [{ action: 'inspect', at: 40 }] }] },
        relationshipTraceIndex: 2, relationshipTraceCount: 3, compareTechniqueAttempts: true,
      });
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const updatedNotes = { ...fixture.state.organNotes, 'frog|nictitating': 'Keep the revised observation before restarting technique.' };
      await fixture.patch({ organNotes: updatedNotes });
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).not.toBeNull();
      const before = scenarioSessionWorkProof(fixture.state);
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart-confirm'));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(fixture.state.procedureScenario).toBe('timed-practical');
      expect(fixture.state.scenarioStartedAt).toBe(now);
      expect(fixture.state.scenarioTimeRemaining).toBe(240);
      expect(fixture.state.scenarioCompletedAt).toBe(0);
      expect(fixture.state.exploredOrgans).toEqual({ 'pig|heart': true });
      expect(fixture.state.selectedOrgan).toBeNull();
      const fresh = fixture.state.procedureByLayer.skin;
      expect(fresh).toMatchObject({
        inspected: false, incisionStarted: false, incisionExtended: false, retracted: false,
        pins: [], probed: false, errors: 0, protocolDeviations: 0,
        history: [], actionLog: [], cautionLog: [], learningChecks: {},
      });
      expect(fresh.tissueState).not.toEqual(before.procedureByLayer.skin.tissueState);
      expect(fixture.state.procedureByLayer.organs).toEqual(before.procedureByLayer.organs);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual({
        ...before, selectedOrgan: null, exploredOrgans: { 'pig|heart': true },
        procedureByLayer: { ...before.procedureByLayer, skin: fresh },
        scenarioStartedAt: now, scenarioTimeRemaining: 240, scenarioCompletedAt: 0,
        relationshipTraceIndex: 0, relationshipTraceCount: 0, compareTechniqueAttempts: false,
      });
      expect(fixture.state.organNotes).toEqual(updatedNotes);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-scenario-restart'));
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it.each([
    ['the selected specimen changes', (state) => ({ specimen: 'pig', _dissLoadedSpec: 'pig' })],
    ['the selected layer changes', (state) => ({ activeLayer: 'organs' })],
    ['the scenario changes', (state) => ({ procedureScenario: 'preservation' })],
    ['the current technique changes', (state) => ({ procedureByLayer: { ...state.procedureByLayer, skin: { ...state.procedureByLayer.skin, history: [...state.procedureByLayer.skin.history, 'probe'] } } })],
    ['inspection records change', (state) => ({ exploredOrgans: { ...state.exploredOrgans, 'frog|dorsal_skin': true } })],
    ['another layer technique changes', (state) => ({ procedureByLayer: { ...state.procedureByLayer, organs: { ...state.procedureByLayer.organs, history: [...state.procedureByLayer.organs.history, 'probe'] } } })],
    ['another specimen inspection changes', (state) => ({ exploredOrgans: { ...state.exploredOrgans, 'pig|heart': true } })],
  ])('rejects a queued restart confirmation after %s', async (_case, patch) => {
    const fixture = await mountMarkingFixture({
      revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'precision-access',
      procedureByLayer: {
        skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 50 }] },
        organs: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 60 }] },
      },
    });
    try {
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const queuedConfirm = queuedScenarioConfirmation(fixture.host.querySelector('#diss-scenario-restart-confirm'));
      await fixture.patch(patch(fixture.state));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      const currentWork = scenarioSessionWorkProof(fixture.state);
      await queuedConfirm();
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(currentWork);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('ignores canceled review callbacks after reopening the same scope and keeps the current review usable', async () => {
    const fixture = await mountMarkingFixture({ revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'precision-access' });
    try {
      const before = scenarioSessionWorkProof(fixture.state);
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const oldReview = fixture.host.querySelector('#diss-scenario-restart-review');
      const queuedOldConfirm = queuedScenarioConfirmation(oldReview.querySelector('#diss-scenario-restart-confirm'));
      const queuedOldCancel = queuedScenarioConfirmation(oldReview.querySelector('#diss-scenario-restart-cancel'));
      const oldReviewPropsKey = Object.keys(oldReview).find((key) => key.startsWith('__reactProps$'));
      expect(oldReviewPropsKey).toBeDefined();
      const queuedOldEscape = oldReview[oldReviewPropsKey].onKeyDown;
      expect(typeof queuedOldEscape).toBe('function');
      await clickEvidenceControl(oldReview.querySelector('#diss-scenario-restart-cancel'));
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const currentReview = fixture.host.querySelector('#diss-scenario-restart-review');
      expect(currentReview).not.toBe(oldReview);
      const cancel = currentReview.querySelector('#diss-scenario-restart-cancel');
      expect(document.activeElement).toBe(cancel);
      await queuedOldConfirm();
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBe(currentReview);
      expect(document.activeElement).toBe(cancel);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await queuedOldCancel();
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBe(currentReview);
      expect(document.activeElement).toBe(cancel);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      const staleEscape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      await act(async () => { queuedOldEscape(staleEscape); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(staleEscape.defaultPrevented).toBe(false);
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBe(currentReview);
      expect(document.activeElement).toBe(cancel);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(currentReview.querySelector('#diss-scenario-restart-confirm'));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(fixture.state.procedureByLayer.skin.inspected).toBe(false);
      expect(fixture.state.procedureByLayer.skin.history).toEqual([]);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['Compare', { compareMode: true }, 'comparison'],
    ['Flashcard', { flashcardMode: true }, 'flashcards'],
    ['practice assessment', { quizMode: true }, 'quiz'],
    ['timed identification', { practicalMode: true, quizMode: true, practicalTimer: 75, practicalEndsAt: 1800000075000, practicalTargetIds: ['nictitating', 'tympanum'] }, 'quiz'],
    ['Guided investigation', { guidedMode: true, guidedStep: 0, guidedTargetIds: ['nictitating'] }, 'canvas'],
  ])('keeps %s guidance ahead of expired technique recovery', async (_case, patch, expectedAction) => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1800000000000);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: 1799999759000,
        scenarioTimeRemaining: 125, scenarioCompletedAt: 0, ...patch,
      });
      expect(fixture.host.querySelector('[data-dissection-next-action]').getAttribute('data-next-action')).toBe(expectedAction);
      expect(fixture.host.querySelector('#diss-next-action-primary').textContent).not.toBe('Review challenge recovery');
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });
