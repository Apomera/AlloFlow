
  // Field-monitor navigation follows the current learning phase. These tests
  // use the native monitor control and preserve learner-authored work.
  async function openHandoffMonitor(fixture) {
    const monitor = fixture.host.querySelector('.diss-field-monitor');
    expect(monitor).not.toBeNull();
    if (!monitor.open) await clickEvidenceControl(monitor.querySelector('summary'));
    expect(monitor.open).toBe(true);
    return monitor;
  }

  function monitorHandoffWorkProof(state) {
    return JSON.parse(JSON.stringify({
      work: markingWorkProof(state), activeInstrument: state.activeInstrument,
      techniquePanelOpen: state.techniquePanelOpen, procedureFeedback: state.procedureFeedback,
      simplifiedInstructions: state.simplifiedInstructions,
    }));
  }

  it('monitor handoff names the required plan and focuses it without changing work', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, { simplifiedInstructions: true }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toBe('Review plan');
      expect(action.getAttribute('aria-label')).toContain('Review plan');
      expect(action.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Plan needed');
      expect(fixture.host.querySelector('#diss-procedure-summary > span').textContent).toMatch(/[Pp]lan/);
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).toBe('Next: choose a safe plan.');
      const performed = fixture.host.querySelector('.diss-procedure__steps');
      expect(performed.getAttribute('role')).toBe('group');
      expect(performed.getAttribute('aria-label')).toBe('0 of 6 actions performed');
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff keeps the performed action current until its explanation is verified', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } },
    }, { simplifiedInstructions: true }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toBe('Explain result');
      expect(action.getAttribute('aria-label')).toContain('Explain result');
      expect(action.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Explanation needed');
      const summary = fixture.host.querySelector('#diss-procedure-summary > span').textContent;
      const simplified = fixture.host.querySelector('#diss-active-tool-help').textContent;
      expect(summary).toMatch(/[Ee]xpla(?:in|nation)/);
      expect(simplified).toBe('Next: explain the observed result.');
      expect(summary + simplified).not.toContain('Begin the shallow ventral midline opening');
      expect(fixture.host.querySelector('.diss-procedure__steps').getAttribute('aria-label')).toBe('1 of 6 actions performed');
      expect(readTechniqueRoadmap(fixture).progress.value).toBe(0);
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-learning-action')).toBe('inspect');
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff waits for the final explanation before presenting technique completion', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('probe', {
      probed: true, history: [...actionHandoffOrder], cautionLog: [],
      tissueState: {
        ...actionHandoffTissue, consequences: [], lastAction: 'prepared', lastUpdatedAt: 100,
        variantId: 'firm', variantLabel: 'Firm preservation',
      },
    }), { simplifiedInstructions: true }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toBe('Explain result');
      expect(action.getAttribute('aria-label')).not.toMatch(/protocol complete|technique complete/i);
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Explanation needed');
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).toBe('Next: explain the observed result.');
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).not.toContain('Done. Complete this layer.');
      expect(fixture.host.querySelector('.diss-procedure__steps').getAttribute('aria-label')).toBe('6 of 6 actions performed');
      expect(readTechniqueRoadmap(fixture).progress.value).toBe(5);
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      const answer = Array.from(fixture.host.querySelectorAll('#diss-learning-checkpoint button')).find((button) =>
        button.textContent.includes('The visible boundary is traced and identified without increasing tissue stress.'));
      await clickEvidenceControl(answer);
      const completeAction = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(completeAction.disabled).toBe(true);
      expect(completeAction.textContent).toBe('Technique complete');
      expect(completeAction.hasAttribute('aria-controls')).toBe(false);
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Technique complete');
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).toBe('Technique complete. Review specimen evidence.');
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(fixture.state.procedureByLayer.skin.learningChecks.probe.reflectionCorrect).toBe(true);
      const after = markingWorkProof(fixture.state);
      const beforeWork = before.work;
      expect({ ...after.procedureByLayer.skin, learningChecks: undefined }).toEqual({ ...beforeWork.procedureByLayer.skin, learningChecks: undefined });
      expect({ ...after, procedureByLayer: undefined }).toEqual({ ...beforeWork, procedureByLayer: undefined });
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff preserves native preparation and leaves instrument selection to the learner', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('scalpel'), {
      activeInstrument: 'probe', techniquePanelOpen: false,
    }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = markingWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toMatch(/^Prepare/);
      expect(action.getAttribute('aria-controls')).not.toBe('diss-learning-checkpoint');
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Step 2 of 6');
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-instrument-scalpel'));
      expect(fixture.state.techniquePanelOpen).toBe(true);
      expect(fixture.state.activeInstrument).toBe('probe');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff labels a revealed layer without offering a nonexistent checkpoint', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, { revealedLayers: { skin: true } }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(true);
      expect(action.textContent).toBe('Layer revealed');
      expect(action.hasAttribute('aria-controls')).toBe(false);
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Layer revealed');
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      await clickEvidenceControl(action);
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff pauses navigation during an animation and restores the same planning route', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState());
    try {
      const monitor = await openHandoffMonitor(fixture);
      const incision = { active: true, startTick: Date.now(), layerName: 'skin' };
      await fixture.patch({ _incisionAnim: incision });
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(true);
      expect(action.textContent).toMatch(/^Technique in progress/);
      expect(action.hasAttribute('aria-controls')).toBe(false);
      await clickEvidenceControl(action);
      expect(fixture.state._incisionAnim).toEqual(incision);
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      await fixture.patch({ _incisionAnim: null });
      const restored = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(restored.disabled).toBe(false);
      expect(restored.textContent).toBe('Review plan');
      expect(restored.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['guided investigation', { guidedMode: true }],
    ['practice assessment', { quizMode: true }],
    ['timed practical', { practicalMode: true, quizMode: true }],
    ['study tools', { toolbarStudyOpen: true }],
  ])('monitor handoff hides the procedure action in %s while keeping field metrics', async (_case, patch) => {
    const activePatch = _case === 'timed practical' ? {
      ...patch, practicalTimer: 300, practicalEndsAt: Date.now() + 300000,
      practicalTargetIds: ['ventral_skin', 'tympanum'],
    } : patch;
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, activePatch));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      expect(monitor.querySelector('.diss-stage__telemetry-prepare')).toBeNull();
      expect(monitor.querySelectorAll('.diss-stage__telemetry-metric')).toHaveLength(4);
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });
