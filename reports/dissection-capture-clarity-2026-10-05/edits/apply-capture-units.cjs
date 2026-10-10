const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = 'tests/dissection_lab_improvements.test.js';
const target = path.join(root, file);
const baselineSha256 = 'bbb8ba935a012f0bc200a2567387016564953945fd72890c9e2a82fbb31e9f52';
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const baseline = fs.readFileSync(target, 'utf8');
if (hash(baseline) !== baselineSha256) throw new Error('Unit baseline drift');
const newline = baseline.includes('\r\n') ? '\r\n' : '\n';
const normalized = (value) => value.replace(/\r?\n/g, newline);
const edits = [];
let source = baseline;
function replace(label, oldText, newText) {
  const old = normalized(oldText);
  const replacement = normalized(newText);
  if (source.split(old).length !== 2) throw new Error('Non-unique unit edit: ' + label);
  const beforeSha256 = hash(source);
  source = source.replace(old, replacement);
  edits.push({ label, old, new: replacement, beforeSha256, afterSha256: hash(source) });
}
replace('default specimen capture API request', `      const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
      await clickEvidenceControl(fixture.host.querySelector('[data-evidence-capture]'));
      expect(thumbnailContext.drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0, 220, 264);`, `      const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
      const specimenCapture = vi.fn().mockReturnValue(true);
      sourceCanvas._captureDissectionEvidence = specimenCapture;
      const contents = fixture.host.querySelector('[id="diss-evidence-capture-contents"]');
      expect(contents).not.toBeNull();
      expect(contents.value).toBe('specimen');
      expect(fixture.host.querySelector('label[for="diss-evidence-capture-contents"]').textContent).toBe('Frame contents');
      expect(Array.from(contents.options).map((option) => [option.value, option.textContent])).toEqual([
        ['specimen', 'Specimen and marks'], ['canvas', 'Full canvas with guides'],
      ]);
      await clickEvidenceControl(fixture.host.querySelector('[data-evidence-capture]'));
      expect(specimenCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(thumbnailContext.drawImage).not.toHaveBeenCalled();`);
replace('default capture frozen metadata', `        view: 'dorsal', selectedOrganId: 'nictitating', specimen: 'frog',
      });
      expect(captured.selectedOrganName)`, `        view: 'dorsal', selectedOrganId: 'nictitating', specimen: 'frog',
        captureContents: 'specimen', camera: { zoom: 1.5, panX: 15, panY: -8 }, annotationCount: 1,
      });
      expect(captured.measurementText).toContain('1.6 cm');
      expect(captured.selectedOrganName)`);
replace('default reference and card capture context', `      const capturedCard = fixture.host.querySelector('[data-evidence-id="' + captured.id + '"]');
      const download =`, `      const capturedCard = fixture.host.querySelector('[data-evidence-id="' + captured.id + '"]');
      const cardContext = capturedCard.querySelector('p[data-evidence-capture-context]');
      const referenceContext = fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]');
      expect(cardContext.textContent).toContain('Specimen and marks');
      expect(cardContext.textContent).toContain('Zoom 1.5×');
      expect(cardContext.textContent).toContain('1 mark');
      expect(cardContext.textContent).toContain(captured.measurementText);
      expect(referenceContext.textContent).toBe(cardContext.textContent);
      const download =`);

const additions = `
  async function chooseEvidenceCaptureContents(fixture, value) {
    const select = fixture.host.querySelector('[id="diss-evidence-capture-contents"]');
    expect(select).not.toBeNull();
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(fixture.state.evidenceCaptureContents).toBe(value);
    expect(select.value).toBe(value);
  }

  it('captures the full canvas only after an explicit contents choice and preserves learner work', async () => {
    const fixture = await mountMarkingFixture({
      visualEvidence: [], referenceEvidenceId: null, splitComparison: false, evidenceNotebookOpen: false,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }, { x: 0.4, y: 0.32, type: 'dot' }],
    });
    const thumbnailContext = { drawImage: vi.fn() };
    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,ZnVsbA==');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return this.width === 220 && this.height === 264 ? thumbnailContext : null;
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
      const specimenCapture = vi.fn(() => { throw new Error('Specimen API must not be used for full canvas'); });
      sourceCanvas._captureDissectionEvidence = specimenCapture;
      await chooseEvidenceCaptureContents(fixture, 'canvas');
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(fixture.host.querySelector('[data-evidence-capture]'));
      expect(specimenCapture).not.toHaveBeenCalled();
      expect(thumbnailContext.drawImage).toHaveBeenCalledExactlyOnceWith(sourceCanvas, 0, 0, 220, 264);
      expect(imageSpy).toHaveBeenCalledWith('image/jpeg', 0.72);
      expect(fixture.state.visualEvidence).toHaveLength(1);
      const captured = fixture.state.visualEvidence[0];
      expect(captured).toMatchObject({
        image: 'data:image/jpeg;base64,ZnVsbA==', captureContents: 'canvas',
        camera: { zoom: 1.5, panX: 15, panY: -8 }, annotationCount: 2,
      });
      expect(captured.measurementText).toBe('');
      expect(fixture.host.querySelector('[data-evidence-id="' + captured.id + '"] p[data-evidence-capture-context]').textContent).toContain('Full canvas with guides');
      expect(fixture.state.evidenceCaptureContents).toBe('canvas');
      expect(fixture.state.referenceEvidenceId).toBe(captured.id);
      expect(fixture.state.splitComparison).toBe(true);
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-reference-heading"]'));
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally {
      imageSpy.mockRestore();
      await fixture.close();
    }
  });

  it.each(['missing', 'false', 'throw'])('keeps specimen capture failure %s from saving a mislabeled canvas or changing focus and work', async (failure) => {
    const frames = [{ id: 101, image: 'data:image/jpeg;base64,b2xk', layer: 'skin', view: 'dorsal' }];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      visualEvidence: frames, referenceEvidenceId: 101, splitComparison: false, evidenceNotebookOpen: false,
      evidenceReturnFocusId: 'diss-evidence-compare-101',
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerMode: true, rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    });
    const thumbnailContext = { drawImage: vi.fn() };
    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,dW51c2Vk');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return this.width === 220 && this.height === 264 ? thumbnailContext : null;
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      const previousFrames = fixture.state.visualEvidence;
      const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
      let specimenCapture;
      if (failure === 'missing') delete sourceCanvas._captureDissectionEvidence;
      else {
        specimenCapture = vi.fn(() => {
          if (failure === 'throw') throw new Error('Specimen capture unavailable');
          return false;
        });
        sourceCanvas._captureDissectionEvidence = specimenCapture;
      }
      const capture = fixture.host.querySelector('[data-evidence-capture]');
      capture.focus();
      await clickEvidenceControl(capture);
      if (specimenCapture) expect(specimenCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(thumbnailContext.drawImage).not.toHaveBeenCalled();
      expect(imageSpy).not.toHaveBeenCalled();
      expect(fixture.state.visualEvidence).toBe(previousFrames);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      expect(fixture.state.referenceEvidenceId).toBe(101);
      expect(fixture.state.splitComparison).toBe(false);
      expect(fixture.state.evidenceNotebookOpen).toBe(false);
      expect(fixture.state.evidenceReturnFocusId).toBe('diss-evidence-compare-101');
      expect(fixture.host.querySelector('[id="diss-evidence-notebook"]').open).toBe(false);
      expect(fixture.host.querySelector('[id="diss-reference-heading"]')).toBeNull();
      expect(document.activeElement).toBe(capture);
      expect(fixture.state.procedureFeedback).toMatchObject({ tone: 'caution' });
      expect(fixture.state.procedureFeedback.message).toMatch(/unavailable/i);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally {
      imageSpy.mockRestore();
      await fixture.close();
    }
  });

  it('shows capture context from frozen frames and leaves missing legacy context unknown after live view changes', async () => {
    const frames = [
      { id: 101, image: 'data:image/jpeg;base64,b2xk', layer: 'skin', view: 'dorsal' },
      { id: 102, image: 'data:image/jpeg;base64,bmV3', layer: 'skin', view: 'dorsal',
        captureContents: 'specimen', camera: { zoom: 2, panX: 25, panY: -10 }, annotationCount: 3, measurementText: '2.4 cm model distance' },
    ];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({ visualEvidence: frames, referenceEvidenceId: 102, splitComparison: true, evidenceNotebookOpen: true });
    try {
      const before = evidenceWorkProof(fixture.state);
      const frozenCard = fixture.host.querySelector('[data-evidence-id="102"] p[data-evidence-capture-context]');
      expect(frozenCard.textContent).toContain('Specimen and marks');
      expect(frozenCard.textContent).toContain('Zoom 2×');
      expect(frozenCard.textContent).toContain('3 marks');
      expect(frozenCard.textContent).toContain('2.4 cm model distance');
      const frozenText = frozenCard.textContent;
      expect(fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]').textContent).toBe(frozenText);
      const legacyContext = fixture.host.querySelector('[data-evidence-id="101"] p[data-evidence-capture-context]');
      expect(legacyContext.textContent).toMatch(/contents.*not recorded/i);
      expect(legacyContext.textContent).not.toMatch(/Specimen and marks|Full canvas with guides|Zoom|mark|cm/);
      const legacyText = legacyContext.textContent;
      await fixture.patch({
        canvasZoom: 3, canvasPanX: -25, canvasPanY: 10,
        annotations: [{ x: 0.4, y: 0.4, type: 'dot' }],
        rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
      });
      expect(fixture.host.querySelector('[data-evidence-id="102"] p[data-evidence-capture-context]').textContent).toBe(frozenText);
      expect(fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]').textContent).toBe(frozenText);
      expect(fixture.host.querySelector('[data-evidence-id="101"] p[data-evidence-capture-context]').textContent).toBe(legacyText);
      await clickEvidenceControl(fixture.host.querySelector('[id="diss-evidence-compare-101"]'));
      expect(fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]').textContent).toBe(legacyText);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      const expected = { ...before, canvasZoom: 3, canvasPanX: -25, canvasPanY: 10,
        annotations: [{ x: 0.4, y: 0.4, type: 'dot' }], rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 } };
      expect(evidenceWorkProof(fixture.state)).toEqual(expected);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('saves the explicit frame contents preference and restores it with the specimen notebook', async () => {
    const fixture = await mountMarkingFixture({ evidenceNotebookOpen: true });
    let saved;
    try {
      const before = evidenceWorkProof(fixture.state);
      const frames = JSON.parse(JSON.stringify(fixture.state.visualEvidence));
      expect(fixture.host.querySelector('[id="diss-evidence-capture-contents"]').value).toBe('specimen');
      await chooseEvidenceCaptureContents(fixture, 'canvas');
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
      saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(saved.evidenceCaptureContents).toBe('canvas');
      expect(saved.visualEvidence).toEqual(frames);
      expect(saved.organNotes).toEqual(before.organNotes);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
    const loaded = await mountMarkingFixture({ _dissLoadedSpec: null }, { frog: saved });
    try {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(loaded.state._dissLoadedSpec).toBe('frog');
      expect(loaded.state.evidenceCaptureContents).toBe('canvas');
      expect(loaded.host.querySelector('[id="diss-evidence-capture-contents"]').value).toBe('canvas');
      expect(loaded.state.visualEvidence).toEqual(saved.visualEvidence);
      expect(loaded.state.organNotes).toEqual(saved.organNotes);
      expect(loaded.awardXP).not.toHaveBeenCalled();
    } finally { await loaded.close(); }
  });

`;
replace('capture choice, rollback, frozen context and preference contracts', `  it('confirms notebook deletion with focus recovery and preserves learner work through reference fallback and clearing', async () => {`, additions + `  it('confirms notebook deletion with focus recovery and preserves learner work through reference fallback and clearing', async () => {`);
const backup = path.join(__dirname, 'unit-capture-baseline.js');
if (fs.existsSync(backup)) throw new Error('Unit backup already exists');
fs.writeFileSync(backup, baseline);
if (hash(fs.readFileSync(backup)) !== baselineSha256) throw new Error('Unit backup mismatch');
fs.writeFileSync(target, source);
const finalSha256 = hash(fs.readFileSync(target));
if (finalSha256 !== hash(source)) throw new Error('Unit write mismatch');
const record = { file, baselineSha256, finalSha256, backupSha256: baselineSha256, edits };
fs.writeFileSync(path.join(__dirname, 'unit-capture-edits.json'), JSON.stringify(record, null, 2) + '\n');
let restored = source;
for (const edit of edits.slice().reverse()) {
  if (restored.split(edit.new).length !== 2) throw new Error('Unit reversal is non-unique');
  restored = restored.replace(edit.new, edit.old);
}
if (restored !== baseline || hash(restored) !== baselineSha256) throw new Error('Unit reversal failed');
process.stdout.write(JSON.stringify({ file, baselineSha256, finalSha256, exactEdits: edits.length, addedCases: 6, reversalVerified: true }) + '\n');
