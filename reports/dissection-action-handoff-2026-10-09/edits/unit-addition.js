  // Action handoff follows the real post-action learning gate. These cases
  // exercise native controls and leave all authored plans/explanations intact.
  const actionHandoffOrder = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  const actionHandoffTissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0 };
  const actionHandoffReflection = 'Next: explain what changed in the learning checkpoint before another technique action.';

  function actionHandoffProcedure(action, patch = {}) {
    const before = actionHandoffOrder.slice(0, actionHandoffOrder.indexOf(action));
    return {
      tissueState: { ...actionHandoffTissue },
      inspected: before.includes('inspect'), incisionStarted: before.includes('scalpel'),
      incisionExtended: before.includes('scissors'), retracted: before.includes('forceps'),
      pins: before.includes('pin') ? [{ x: .45, y: .3 }, { x: .55, y: .8 }] : [],
      probed: false, history: [...before], actionLog: [], errors: 0, protocolDeviations: 0,
      learningChecks: {
        ...Object.fromEntries(before.map((step) => [step, { predictionCorrect: true, reflectionCorrect: true }])),
        [action]: { predictionCorrect: true, reflectionCorrect: false },
      },
      ...patch,
    };
  }

  async function performActionHandoff(fixture) {
    const button = fixture.host.querySelector('.diss-procedure__next');
    expect(button).not.toBeNull();
    expect(button.disabled, button.getAttribute('aria-label')).toBe(false);
    await clickEvidenceControl(button);
    return fixture.state.procedureFeedback.message;
  }

  it.each(actionHandoffOrder)('action handoff sends completed %s to its pending explanation', async (action) => {
    const procedure = actionHandoffProcedure(action, action === 'pin' ? { pins: [{ x: .45, y: .3 }] } : {});
    const instrument = action === 'inspect' ? 'probe' : action;
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure, { activeInstrument: instrument }));
    try {
      const checks = JSON.parse(JSON.stringify(fixture.state.procedureByLayer.skin.learningChecks));
      const message = await performActionHandoff(fixture);
      expect(message).toContain(actionHandoffReflection);
      expect(message).not.toMatch(/Switch to scissors|Use forceps next|Place two well-spaced pins|Next protocol action:|Record evidence or complete the layer|Next checkpoint:/);
      const checkpoint = fixture.host.querySelector('[id="diss-learning-checkpoint"]');
      expect(checkpoint.getAttribute('data-phase')).toBe('reflect');
      expect(checkpoint.getAttribute('data-learning-action')).toBe(action);
      expect(fixture.state.procedureByLayer.skin.actionLog.at(-1).action).toBe(action);
      expect(fixture.state.procedureByLayer.skin.learningChecks).toEqual(checks);
      expect(fixture.state.activeInstrument).toBe(instrument);
      expect(fixture.state.revealedLayers).toEqual({});
      expect(fixture.state.organNotes['frog|nictitating']).toBe('Transparent membrane noted before adding marks.');
      expect([fixture.state.quizScore, fixture.state.quizTotal]).toEqual([1, 2]);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('action handoff keeps the first pin on its second placement before requesting an explanation', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('pin'), { activeInstrument: 'pin' }));
    try {
      const firstMessage = await performActionHandoff(fixture);
      expect(fixture.state.procedureByLayer.skin.pins).toHaveLength(1);
      const secondPlacement = fixture.host.querySelector('.diss-procedure__next').textContent.replace('Motor-neutral: ', '');
      expect(firstMessage).toContain('Next: ' + secondPlacement + '.');
      expect(firstMessage).not.toContain(actionHandoffReflection);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('perform');
      const secondMessage = await performActionHandoff(fixture);
      expect(fixture.state.procedureByLayer.skin.pins).toHaveLength(2);
      expect(secondMessage).toContain(actionHandoffReflection);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('reflect');
      expect(fixture.state.procedureByLayer.skin.actionLog.map((entry) => entry.action)).toEqual(['pin', 'pin']);
    } finally { await fixture.close(); }
  });

  it('action handoff uses earthworm order after a forceps action with saved explanation credit', async () => {
    const procedure = actionHandoffProcedure('forceps', {
      pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }],
      learningChecks: Object.fromEntries(['inspect', 'pin', 'scalpel', 'scissors', 'forceps'].map((action) => [action, { predictionCorrect: true, reflectionCorrect: true }])),
    });
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure, {
      specimen: 'earthworm', _dissLoadedSpec: 'earthworm', anatomicalView: 'dorsal', activeInstrument: 'forceps',
    }));
    try {
      const message = await performActionHandoff(fixture);
      expect(message).toContain('Next: use the learning checkpoint to plan this step: Trace the digestive tract or a visible vessel.');
      expect(message).not.toMatch(/Place two well-spaced pins|Next checkpoint:/);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-learning-action')).toBe('probe');
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('predict');
      expect(fixture.state.procedureByLayer.skin.pins).toHaveLength(2);
      expect(fixture.state.procedureByLayer.skin.retracted).toBe(true);
      expect(fixture.state.procedureByLayer.skin.learningChecks.forceps.reflectionCorrect).toBe(true);
    } finally {
      await fixture.close();
      localStorage.removeItem('dissection_progress_earthworm');
    }
  });

  it('action handoff honors saved orientation evidence during an orientation rescue recheck', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('inspect', {
      inspected: true, orientationRecheckRequired: true,
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true } },
    }), { procedureScenario: 'orientation-rescue', scenarioCompletedAt: 0 }));
    try {
      const message = await performActionHandoff(fixture);
      expect(message).toContain('Next: use the learning checkpoint to plan this step: Begin the shallow ventral midline opening.');
      expect(message).toContain('Scenario checkpoint: 100%.');
      expect(message).toContain('Objective complete.');
      expect(message).not.toContain('Review the debrief or restart');
      expect(message).not.toContain(actionHandoffReflection);
      expect(fixture.state.procedureByLayer.skin.orientationRecheckRequired).toBe(false);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.reflectionCorrect).toBe(true);
      expect(fixture.state.scenarioCompletedAt).toBeGreaterThan(0);
    } finally { await fixture.close(); }
  });

  it('action handoff offers evidence review after a final probe with saved explanation credit', async () => {
    const procedure = actionHandoffProcedure('probe');
    procedure.learningChecks.probe.reflectionCorrect = true;
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure));
    try {
      const message = await performActionHandoff(fixture);
      expect(message).toContain('Next: review your observations and the remaining layer evidence.');
      expect(message).not.toContain(actionHandoffReflection);
      expect(message).not.toContain('Record evidence or complete the layer');
      expect(fixture.state.procedureByLayer.skin.probed).toBe(true);
      expect(fixture.state.revealedLayers).toEqual({});
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]')).toBeNull();
      expect(fixture.state.quizScore).toBe(1);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('action handoff leaves optional hydration on native scenario guidance without a new learning cycle', async () => {
    const procedure = actionHandoffProcedure('scalpel');
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure, { activeInstrument: 'dropper' }));
    try {
      const checks = JSON.parse(JSON.stringify(fixture.state.procedureByLayer.skin.learningChecks));
      const control = Array.from(fixture.host.querySelectorAll('button')).find((button) => button.textContent.includes('Apply controlled drop'));
      expect(control).not.toBeNull();
      expect(control.disabled).toBe(false);
      await clickEvidenceControl(control);
      const message = fixture.state.procedureFeedback.message;
      expect(message).toContain('Controlled saline dose applied');
      expect(message).toContain('Next checkpoint: Begin the shallow ventral midline opening.');
      expect(message).not.toContain('Next:');
      expect(fixture.state.procedureByLayer.skin.actionLog.at(-1).action).toBe('dropper');
      expect(fixture.state.procedureByLayer.skin.learningChecks).toEqual(checks);
      expect(fixture.state.procedureByLayer.skin.incisionStarted).toBe(false);
      expect(fixture.state.procedureByLayer.skin.tissueState.salineDrops).toBeGreaterThan(0);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-learning-action')).toBe('scalpel');
    } finally { await fixture.close(); }
  });

