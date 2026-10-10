  it('names specimen display tasks while retaining native control order and focus stops', async () => {
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true });
    try {
      const panel = fixture.host.querySelector('#diss-view-tools');
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('tabindex')).toBe('-1');
      expect(Array.from(panel.querySelectorAll('[data-diss-view-group]')).map((group) => group.getAttribute('data-diss-view-group')))
        .toEqual(['accessibility', 'specimen', 'lighting', 'workspace']);
      const specimen = panel.querySelector('[data-diss-view-group="specimen"]');
      const groups = Array.from(specimen.querySelectorAll('[data-diss-view-subgroup]'));
      expect(groups.map((group) => group.getAttribute('data-diss-view-subgroup')))
        .toEqual(['presentation', 'inspection', 'scene', 'reference']);
      const names = ['Anatomy and presentation', 'Local inspection', 'Scene and landmarks', 'Reference and variation'];
      groups.forEach((group, index) => {
        expect(group.getAttribute('role')).toBe('group');
        const id = group.getAttribute('aria-labelledby');
        const heading = group.querySelector('[id="' + id + '"]');
        expect(heading.tagName).toBe('H5');
        expect(heading.textContent).toBe(names[index]);
        expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
        expect(group.hasAttribute('tabindex')).toBe(false);
      });
      expect(groups.map((group) => group.querySelectorAll('button').length)).toEqual([6, 4, 8, 3]);
      expect(Array.from(specimen.querySelectorAll('button')).map((button) => button.textContent.replace(/^[^A-Za-z]+/, ''))).toEqual([
        'Visuals: Accessible', 'View: dorsal', 'Layer map off', 'Condition: standard', 'Relationships off', 'Quality: auto',
        'Lens on', 'Unpin lens', 'Magnify 4x', 'Focus: surface', 'Visual tools on', 'Macro view on', 'Scene detail on',
        'Depth atlas on', 'Tissue relief on', 'Flow motion on', 'Focus mode on', 'Depth motion off',
        'Split compare off', 'Variation 1', 'Tissue: after',
      ]);
      const controls = Array.from(panel.querySelectorAll('button, input'));
      expect(panel.querySelectorAll('button')).toHaveLength(33);
      expect(panel.querySelectorAll('input')).toHaveLength(1);
      expect(Array.from(panel.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))).toEqual(controls);
      for (const button of specimen.querySelectorAll('button[aria-describedby]')) {
        for (const id of button.getAttribute('aria-describedby').split(/\s+/)) {
          const help = specimen.querySelector('[id="' + id + '"]');
          expect(help).not.toBeNull();
          expect(help.textContent.trim().length).toBeGreaterThan(0);
          expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
        }
      }
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('explains Essentials display limits and retains assessment presentation controls without exposing inspection tasks', () => {
    const base = {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
      workspaceMode: 'essentials', toolbarViewOpen: true, visualRealism: 'realistic',
    };
    const essentials = new DOMParser().parseFromString(renderTool('dissection', { dissection: base }), 'text/html');
    const panel = essentials.querySelector('#diss-view-tools');
    expect(panel.querySelectorAll('button')).toHaveLength(33);
    expect(panel.querySelector('#diss-view-presentation-help').textContent)
      .toBe('Essentials uses Guided presentation. Select Advanced workspace to use the other presentation modes.');
    expect(panel.querySelector('#diss-view-inspection-help').textContent)
      .toBe('Local lens inspection is available in Advanced workspace.');
    expect(panel.querySelector('#diss-view-scene-help').textContent)
      .toContain('Essentials uses the default scene display.');
    expect(panel.querySelector('#diss-view-reference-help').textContent)
      .toContain('Saved-frame split comparison is available in Advanced workspace.');
    expect(panel.querySelector('button[aria-label^="Visual presentation"]').textContent).toContain('Visuals: Guided');
    const assessment = new DOMParser().parseFromString(renderTool('dissection', {
      dissection: { ...base, workspaceMode: 'advanced', quizMode: true, visualRealism: 'guided' },
    }), 'text/html');
    const assessed = assessment.querySelector('#diss-view-tools');
    expect(Array.from(assessed.querySelectorAll('[data-diss-view-subgroup]')).map((group) => group.getAttribute('data-diss-view-subgroup')))
      .toEqual(['presentation']);
    expect(assessed.querySelector('[data-diss-view-subgroup="presentation"]').querySelectorAll('button')).toHaveLength(1);
    expect(assessed.querySelector('#diss-view-presentation-help').textContent)
      .toBe('Guided uses balanced materials and visible technique targets.');
    expect(assessed.querySelector('#diss-view-cycle')).toBeNull();
    expect(assessed.querySelector('button[aria-label="Organ name labels hidden during assessment"]').disabled).toBe(true);
    expect(assessed.querySelector('button[aria-label="Toggle high contrast mode"]')).not.toBeNull();
    expect(assessed.querySelector('#diss-light-intensity-range')).toBeNull();
  });

  it('describes native presentation changes and retains Accessible preferences when returning to Guided', async () => {
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true, visualRealism: 'guided', highContrast: false, animSpeed: 'normal' });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const control = () => fixture.host.querySelector('#diss-view-tools button[aria-label^="Visual presentation"]');
      const help = () => fixture.host.querySelector('#diss-view-presentation-help').textContent;
      await clickEvidenceControl(control());
      expect(fixture.state.visualRealism).toBe('realistic');
      expect(help()).toContain('richer materials, natural landmark variation, and reduced teaching emphasis');
      expect(fixture.state.highContrast).toBe(false);
      expect(fixture.state.animSpeed).toBe('normal');
      await clickEvidenceControl(control());
      expect(fixture.state.visualRealism).toBe('accessible');
      expect(fixture.state.highContrast).toBe(true);
      expect(fixture.state.animSpeed).toBe('slow');
      expect(help()).toContain('High contrast and slow animation stay active when you change presentation.');
      expect(fixture.host.querySelector('#diss-view-tools button[aria-label="Toggle high contrast mode"]').getAttribute('aria-pressed')).toBe('true');
      await clickEvidenceControl(control());
      expect(fixture.state.visualRealism).toBe('guided');
      expect(control().textContent).toContain('Visuals: Guided');
      expect(fixture.state.highContrast).toBe(true);
      expect(fixture.state.animSpeed).toBe('slow');
      expect(help()).toBe('Guided uses balanced materials and visible technique targets.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['the explicitly selected valid frame', 101, 1, 'Outer skin frame', 'data:image/jpeg;base64,YQ=='],
    ['the final valid frame when the saved reference is missing', 999, 2, 'Organ frame', 'data:image/jpeg;base64,Yg=='],
    ['missing valid evidence', 103, null, null, null],
  ])('describes and opens %s through the native split resolver while preserving saved evidence', async (_case, referenceEvidenceId, frameNumber, layerName, image) => {
    const frames = [
      { id: 101, image: 'data:image/jpeg;base64,YQ==', layer: 'skin', layerName: 'Outer skin frame', view: 'dorsal' },
      { id: 102, image: 'data:image/jpeg;base64,Yg==', layer: 'organs', layerName: 'Organ frame', view: 'internal' },
      { id: 103, image: null, layer: 'skin' },
    ];
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true, visualEvidence: frameNumber ? frames : frames.slice(2), referenceEvidenceId, splitComparison: false });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const split = fixture.host.querySelector('#diss-view-tools button[aria-label="Toggle live and reference split comparison"]');
      expect(split.getAttribute('aria-describedby')).toBe('diss-view-reference-help');
      if (!frameNumber) {
        expect(split.disabled).toBe(true);
        expect(split.getAttribute('aria-pressed')).toBe('false');
        expect(fixture.host.querySelector('#diss-view-reference-help').textContent)
          .toBe('Capture a frame in Lab tools to enable the live/reference split.');
        await clickEvidenceControl(split);
        expect(fixture.state.splitComparison).toBe(false);
        expect(fixture.host.querySelector('.diss-split-reference')).toBeNull();
        expect(studyChooserWorkProof(fixture.state)).toEqual(before);
        expect(fixture.awardXP).not.toHaveBeenCalled();
        return;
      }
      expect(split.disabled).toBe(false);
      expect(fixture.host.querySelector('#diss-view-reference-help').textContent)
        .toBe('Compare the live specimen with Frame ' + frameNumber + ' from ' + layerName + '.');
      await clickEvidenceControl(split);
      expect(fixture.state.splitComparison).toBe(true);
      expect(split.getAttribute('aria-pressed')).toBe('true');
      expect(fixture.host.querySelector('#diss-reference-heading').textContent).toBe('Reference frame ' + frameNumber);
      expect(fixture.host.querySelector('.diss-split-reference img').getAttribute('src')).toBe(image);
      expect(fixture.host.querySelector('.diss-split-reference').textContent).toContain(layerName);
      await clickEvidenceControl(split);
      expect(fixture.state.splitComparison).toBe(false);
      expect(split.getAttribute('aria-pressed')).toBe('false');
      expect(fixture.host.querySelector('.diss-split-reference')).toBeNull();
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('keeps native pin prerequisites and cycles local inspection without changing zoom or learner records', async () => {
    const fixture = await mountMarkingFixture({
      toolbarViewOpen: true, selectedOrgan: null, hoveredOrgan: null, inspectionLens: false,
      lensPinned: false, lensPinnedPoint: null, lensPinnedOrganId: null, lensMagnification: 2, lensFocusDepth: 'surface',
    });
    try {
      const pin = () => fixture.host.querySelector('#diss-view-tools button[aria-label="Pin inspection lens to selected structure or current pointer"]');
      const before = studyChooserWorkProof(fixture.state);
      expect(pin().getAttribute('aria-describedby')).toBe('diss-view-inspection-help diss-view-pin-help');
      expect(fixture.host.querySelector('#diss-view-pin-help').textContent)
        .toBe('Select a structure or move over the specimen before pinning.');
      delete fixture.host.querySelector('[data-diss-canvas]')._toolPointer;
      await clickEvidenceControl(pin());
      expect(fixture.state.lensPinned).toBe(false);
      expect(fixture.state.procedureFeedback.message).toBe('Move over the specimen or select a structure before pinning the lens.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      await fixture.patch({ selectedOrgan: 'nictitating' });
      const selectedWork = studyChooserWorkProof(fixture.state);
      await clickEvidenceControl(pin());
      expect(fixture.state.inspectionLens).toBe(true);
      expect(fixture.state.lensPinned).toBe(true);
      expect(fixture.state.lensPinnedOrganId).toBe('nictitating');
      expect(Number.isFinite(fixture.state.lensPinnedPoint.x)).toBe(true);
      expect(Number.isFinite(fixture.state.lensPinnedPoint.y)).toBe(true);
      const magnify = fixture.host.querySelector('#diss-view-tools button[aria-label^="Cycle inspection magnification"]');
      for (const expected of [4, 6, 2]) {
        await clickEvidenceControl(magnify);
        expect(fixture.state.lensMagnification).toBe(expected);
        expect(magnify.textContent).toContain('Magnify ' + expected + 'x');
      }
      const focus = fixture.host.querySelector('#diss-view-tools button[aria-label^="Cycle inspection focus depth"]');
      for (const expected of ['structure', 'deep', 'surface']) {
        await clickEvidenceControl(focus);
        expect(fixture.state.lensFocusDepth).toBe(expected);
        expect(focus.textContent).toContain('Focus: ' + expected);
      }
      await clickEvidenceControl(fixture.host.querySelector('#diss-view-tools button[aria-label="Release pinned inspection target"]'));
      expect(fixture.state.lensPinned).toBe(false);
      expect(fixture.state.lensPinnedPoint).toBeNull();
      expect(fixture.state.lensPinnedOrganId).toBeNull();
      const expectedWork = { ...selectedWork, inspectionLens: true };
      expect(studyChooserWorkProof(fixture.state)).toEqual(expectedWork);
      await fixture.patch({ selectedOrgan: null });
      const pointerWork = studyChooserWorkProof(fixture.state);
      fixture.host.querySelector('[data-diss-canvas]')._toolPointer = { x: 0.42, y: 0.31 };
      await clickEvidenceControl(fixture.host.querySelector('#diss-view-tools button[aria-label="Pin inspection lens to selected structure or current pointer"]'));
      expect(fixture.state.lensPinnedPoint).toEqual({ x: 0.42, y: 0.31 });
      expect(fixture.state.lensPinnedOrganId).toBeNull();
      expect(studyChooserWorkProof(fixture.state)).toEqual({
        ...pointerWork, inspectionLens: true, lensPinned: true, lensPinnedPoint: { x: 0.42, y: 0.31 }, lensPinnedOrganId: null,
      });
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('changes displayed variation and tissue overlay while preserving recorded technique and evidence', async () => {
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true, variationSeed: 3, beforeTechniqueView: false });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const variation = fixture.host.querySelector('#diss-view-tools button[aria-label="Generate another deterministic specimen variation"]');
      expect(fixture.host.querySelector('#diss-view-tissue-help').textContent)
        .toBe('Tissue before/after changes the displayed technique overlay. Your recorded technique stays saved.');
      await clickEvidenceControl(variation);
      expect(fixture.state.variationSeed).toBe(4);
      expect(variation.textContent).toContain('Variation 4');
      expect(fixture.state.procedureFeedback.message).toContain('Loaded specimen variation 4.');
      const tissue = fixture.host.querySelector('#diss-view-tools button[aria-label^="Tissue: after technique"]');
      expect(tissue.getAttribute('aria-describedby')).toBe('diss-view-tissue-help');
      await clickEvidenceControl(tissue);
      expect(fixture.state.beforeTechniqueView).toBe(true);
      expect(tissue.getAttribute('aria-label')).toBe('Tissue: before technique. Activate to show the tissue after the technique.');
      await clickEvidenceControl(tissue);
      expect(fixture.state.beforeTechniqueView).toBe(false);
      expect(tissue.getAttribute('aria-label')).toBe('Tissue: after technique. Activate to show the tissue before the technique.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('uses actual timed-practical entry and teardown to hide orientation and disable labels while preserving work', async () => {
    const fixture = await mountMarkingFixture({
      toolbarViewOpen: true, toolbarStudyOpen: true, selectedOrgan: null, hoveredOrgan: null,
      labelMode: 'show', inspectionLens: false, lensPinned: false, lensPinnedPoint: null, lensPinnedOrganId: null,
      quizScore: 0, quizTotal: 0,
    });
    try {
      const before = studyChooserWorkProof(fixture.state);
      expect(fixture.host.querySelector('#diss-view-cycle')).not.toBeNull();
      await clickEvidenceControl(fixture.host.querySelector('#diss-study-tools button[aria-label="Start 2-minute timed practical"]'));
      expect(fixture.state.practicalMode).toBe(true);
      expect(fixture.state.quizMode).toBe(true);
      expect(fixture.state.labelMode).toBe('hidden');
      expect(fixture.state.toolbarViewOpen).toBe(false);
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="Accessibility options"]'));
      expect(fixture.host.querySelector('#diss-view-cycle')).toBeNull();
      expect(fixture.host.querySelector('#diss-view-tools [data-diss-view-subgroup="inspection"]')).toBeNull();
      const labels = fixture.host.querySelector('#diss-view-tools button[aria-label="Organ name labels hidden during assessment"]');
      expect(labels.disabled).toBe(true);
      expect(labels.getAttribute('aria-pressed')).toBe('false');
      await clickEvidenceControl(labels);
      expect(fixture.state.labelMode).toBe('hidden');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(fixture.host.querySelector('#diss-route-study'));
      await clickEvidenceControl(fixture.host.querySelector('#diss-study-tools button[aria-label="End timed practical"]'));
      expect(fixture.state.practicalMode).toBe(false);
      expect(fixture.state.quizMode).toBe(false);
      expect(fixture.state.labelMode).toBe('show');
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="View and accessibility options"]'));
      expect(fixture.host.querySelector('#diss-view-cycle').disabled).toBe(false);
      expect(fixture.host.querySelector('#diss-view-tools button[aria-label="Toggle organ name labels"]').disabled).toBe(false);
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['no selection', { selectedOrgan: null }, 'Select a structure to compare',
      'Inspect a visible structure first to check whether cross-specimen references are mapped for it.', 'canvas', '#diss-canvas'],
    ['an unmapped selection', { selectedOrgan: 'nictitating' }, 'No cross-specimen comparison is mapped for Nictitating Membrane',
      'Open the comparison panel to review its scope, or inspect another visible structure to check reference availability.', 'comparison', '#diss-comparison-panel'],
    ['a mapped selection', { activeLayer: 'organs', anatomicalView: 'ventral', selectedOrgan: 'heart' }, 'Compare this structure across specimens',
      'Use the selected structure as the shared anatomical reference.', 'comparison', '#diss-comparison-panel'],
  ])('keeps comparison next-action guidance honest for %s and uses the native focus route without awarding work', async (_case, patch, title, description, action, target) => {
    const fixture = await mountMarkingFixture({ compareMode: true, ...patch });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const next = fixture.host.querySelector('[data-dissection-next-action]');
      expect(next.getAttribute('data-next-action')).toBe(action);
      expect(next.querySelector('#diss-next-action-title').textContent).toBe(title);
      expect(next.querySelector('.diss-next-action__body > p').textContent).toBe(description);
      expect(fixture.host.querySelector('.diss-stage__handoff').textContent).toContain(title);
      const primary = next.querySelector('.diss-next-action__primary');
      expect(primary.textContent).toBe(action === 'canvas' ? 'Go to specimen' : 'Go to comparison');
      await clickEvidenceControl(primary);
      expect(document.activeElement).toBe(fixture.host.querySelector(target));
      if (action === 'canvas') expect(fixture.host.querySelector('#diss-comparison-panel')).toBeNull();
      else expect(fixture.host.querySelector('#diss-comparison-panel').getAttribute('data-comparison-group'))
        .toBe(patch.selectedOrgan === 'heart' ? 'pumps' : 'unmapped');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });
