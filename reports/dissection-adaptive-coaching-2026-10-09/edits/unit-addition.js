  // Adaptive advice navigates to the controls the learner needs without
  // performing a technique, changing calibration, or supplying an answer.
  const adaptiveCoachingMetrics = { alignment: 95, coverage: 95, angleControl: 95, control: 95, precision: 95, smoothness: 95 };

  function adaptiveCoachingProcedure(patch = {}, tissuePatch = {}) {
    const base = checkpointCoachingProcedure();
    return { ...base, ...patch, tissueState: { ...base.tissueState, ...tissuePatch } };
  }

  function adaptiveCoachingFixtureState(procedure, patch = {}) {
    return techniqueRoadmapState(procedure, {
      procedureMode: 'independent', activeInstrument: 'scalpel',
      adaptiveGuidance: true, instructorTarget: 82,
      toolbarViewOpen: false, compareTechniqueAttempts: false,
      procedureFeedback: { message: 'Keep this recorded feedback.', tone: 'working' },
      ...patch,
    });
  }

  function adaptiveCoachingWorkProof(state) {
    const { techniquePanelOpen, toolbarViewOpen, compareTechniqueAttempts, ...work } = state;
    return JSON.parse(JSON.stringify(work));
  }

  function adaptiveCoachingAction(fixture, focus, label, target, mounted = true) {
    const panel = fixture.host.querySelector('#diss-adaptive-coaching');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-labelledby')).toBe('diss-adaptive-coaching-title');
    expect(panel.querySelector('#diss-adaptive-coaching-title').textContent).toBe(focus);
    const button = panel.querySelector('button');
    expect(button.textContent).toBe(label);
    expect(button.getAttribute('aria-controls')).toBe(mounted ? target : null);
    const describedIds = button.getAttribute('aria-describedby').split(/\s+/);
    expect(describedIds).toEqual(['diss-adaptive-coaching-suggestion', 'diss-adaptive-coaching-help']);
    for (const id of describedIds) expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
    expect(panel.querySelector('#diss-adaptive-coaching-help').textContent).toBe('Opens controls for review.');
    return button;
  }

  it.each([
    ['dry field', {}, { moisture: 25 }, {}, 'Surface moisture', 'Review Dropper', 'diss-instrument-dropper'],
    ['restricted dry field', {}, { moisture: 25 }, { procedureScenario: 'restricted-tray' }, 'Surface moisture', 'Review tissue condition', 'diss-field-monitor-summary'],
    ['tissue trauma', {}, { trauma: 48 }, {}, 'Tissue preservation', 'Review tissue condition', 'diss-field-monitor-summary'],
    ['high tension', {}, { tension: 90 }, {}, 'Retraction tension', 'Review tissue condition', 'diss-field-monitor-summary'],
    ['recorded safety caution', { cautionLog: [{ message: 'Verify the corridor before further contact.', at: 100 }] }, {}, {}, 'Safety sequence', 'Review technique controls', 'diss-procedure-summary'],
    ['orientation', {}, {}, {}, 'Orientation', 'Review technique controls', 'diss-procedure-summary'],
    ['low field quality', { incisionMetrics: adaptiveCoachingMetrics }, { clarity: 20, exposure: 20, stability: 30 }, {}, 'Access width', 'Review tissue condition', 'diss-field-monitor-summary'],
  ])('adaptive coaching reviews %s without changing learner work or selecting an instrument', async (_case, procedurePatch, tissuePatch, statePatch, focus, label, targetId) => {
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(adaptiveCoachingProcedure(procedurePatch, tissuePatch), statePatch));
    try {
      const action = adaptiveCoachingAction(fixture, focus, label, targetId);
      const before = adaptiveCoachingWorkProof(fixture.state);
      if (_case === 'restricted dry field') {
        expect(fixture.host.querySelector('#diss-instrument-dropper').disabled).toBe(true);
        expect(fixture.host.querySelector('#diss-adaptive-coaching-suggestion').textContent).toContain('Hydration tools are unavailable');
      }
      action.focus();
      await clickEvidenceControl(action);
      const target = fixture.host.querySelector('#' + targetId);
      expect(document.activeElement).toBe(target);
      expect(fixture.state.techniquePanelOpen).toBe(true);
      if (targetId === 'diss-field-monitor-summary') expect(target.closest('details').open).toBe(true);
      if (targetId === 'diss-instrument-dropper') expect(target.getAttribute('aria-checked')).toBe('false');
      expect(fixture.state.toolbarViewOpen).toBe(false);
      expect(fixture.state.compareTechniqueAttempts).toBe(false);
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('adaptive coaching opens optical controls without changing the inspected target or focus settings', async () => {
    const procedure = adaptiveCoachingProcedure({ incisionMetrics: adaptiveCoachingMetrics });
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(procedure, {
      selectedOrgan: 'ventral_skin', inspectionLens: true, lensPinned: false,
      lensFocusDepth: 'deep', lensMagnification: 6,
    }));
    try {
      const action = adaptiveCoachingAction(fixture, 'Optical focus', 'Review view controls', 'diss-view-tools', false);
      expect(fixture.host.querySelector('#diss-view-tools')).toBeNull();
      const before = adaptiveCoachingWorkProof(fixture.state);
      await clickEvidenceControl(action);
      const viewControls = fixture.host.querySelector('#diss-view-tools');
      expect(document.activeElement).toBe(viewControls);
      expect(fixture.state.toolbarViewOpen).toBe(true);
      expect(fixture.state.compareTechniqueAttempts).toBe(false);
      adaptiveCoachingAction(fixture, 'Optical focus', 'Review view controls', 'diss-view-tools');
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('adaptive coaching reviews the next instrument without applying calibration or changing the selected tool', async () => {
    const procedure = adaptiveCoachingProcedure({
      ...actionHandoffProcedure('scissors'), incisionMetrics: adaptiveCoachingMetrics,
    });
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(procedure, {
      toolCalibration: { bladeAngle: 25, scissorsAperture: 70, forcepsGrip: 40, pinAngle: 65, probePressure: 30, salineDose: 1 },
    }));
    try {
      const action = adaptiveCoachingAction(fixture, 'Instrument calibration', 'Review Scissors', 'diss-instrument-scissors');
      const before = adaptiveCoachingWorkProof(fixture.state);
      await clickEvidenceControl(action);
      const scissors = fixture.host.querySelector('#diss-instrument-scissors');
      expect(document.activeElement).toBe(scissors);
      expect(scissors.getAttribute('aria-checked')).toBe('false');
      expect(fixture.state.activeInstrument).toBe('scalpel');
      expect(fixture.state.toolCalibration.scissorsAperture).toBe(70);
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('adaptive coaching reveals saved comparison without starting playback or replacing the baseline', async () => {
    const procedure = adaptiveCoachingProcedure({ incisionMetrics: adaptiveCoachingMetrics });
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(procedure, {
      compareReplayProgress: 0.37, compareReplayPlaying: false,
      attemptArchive: { skin: [{ id: 7, score: 100, precision: 90, coverage: 90, control: 90, angleControl: 90, cautions: 0, view: 'ventral', inputType: 'mouse', incisionPath: [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.6 }] }] },
    }));
    try {
      const action = adaptiveCoachingAction(fixture, 'Strategy change', 'Review saved comparison', 'diss-compare-replay-progress', false);
      expect(fixture.host.querySelector('#diss-compare-replay-progress')).toBeNull();
      const before = adaptiveCoachingWorkProof(fixture.state);
      await clickEvidenceControl(action);
      const replay = fixture.host.querySelector('#diss-compare-replay-progress');
      expect(document.activeElement).toBe(replay);
      expect(fixture.state.compareTechniqueAttempts).toBe(true);
      expect(fixture.state.techniquePanelOpen).toBe(true);
      expect(fixture.state.toolbarViewOpen).toBe(false);
      adaptiveCoachingAction(fixture, 'Strategy change', 'Review saved comparison', 'diss-compare-replay-progress');
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });
