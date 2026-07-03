import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let OG;
let OS;
let OA;
let UI;

beforeAll(() => {
  loadAlloModule('music_studio/open_groove_core.js');
  loadAlloModule('music_studio/open_groove_scheduler.js');
  loadAlloModule('music_studio/open_groove_audio.js');
  loadAlloModule('music_studio/open_groove_module.js');
  OG = window.AlloModules.OpenGrooveCore;
  OS = window.AlloModules.OpenGrooveScheduler;
  OA = window.AlloModules.OpenGrooveAudio;
  UI = window.AlloModules.OpenGrooveStudio;
  if (!OG || !OS || !OA || !UI) throw new Error('Open Groove modules failed to register');
});

describe('Open Groove project core', () => {
  it('creates a valid 4-bar starter project with drum and synth tracks', () => {
    const project = OG.ogCreateProject({ title: 'Test Groove', bpm: 100, now: 123 });
    expect(project.format).toBe('opengroove');
    expect(OG.OG_LEARNING_TOOL_META.category).toBe('learning');
    expect(OG.OG_LEARNING_GOALS.some(goal => /notation/i.test(goal))).toBe(true);
    expect(project.ppq).toBe(960);
    expect(project.patterns[0].bars).toBe(4);
    expect(project.tracks.map(track => track.type)).toEqual(['drumRack', 'synth']);
    expect(project.tracks[0].pads.length).toBe(16);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('uses tick math that supports measures, beats, and notation grids', () => {
    const project = OG.ogCreateProject({ timeSignature: [4, 4], ppq: 960 });
    expect(OG.ogTicksPerBeat(project)).toBe(960);
    expect(OG.ogTicksPerMeasure(project)).toBe(3840);
    expect(OG.ogBarsToTicks(project, 4)).toBe(15360);
    expect(OG.ogTickToPosition(project, 3840 + 960 + 120)).toEqual({ bar: 2, beat: 2, tick: 120, absoluteTick: 4920 });
    expect(OG.ogQuantizeTick(491, 240)).toBe(480);
  });

  it('toggles drum steps without creating duplicates', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const first = OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true, velocity: 0.9 });
    const updated = OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true, velocity: 0.5 });
    expect(first.id).toBe(updated.id);
    expect(pattern.events.length).toBe(1);
    expect(pattern.events[0].velocity).toBe(0.5);
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: false });
    expect(pattern.events.length).toBe(0);
  });

  it('accentuates, clears, and humanizes drum lanes deterministically', () => {
    const project = OG.ogCreateProject({ title: 'Groove Tools' });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true, velocity: 0.4 });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 2, 16, { on: true, velocity: 0.4 });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_2', 4, 16, { on: true, velocity: 0.5 });
    expect(OG.ogAccentPadEvents(project, pattern.id, drums.id, 'pad_1', 1)).toBe(2);
    expect(pattern.events.filter(event => event.padId === 'pad_1').every(event => event.velocity === 1)).toBe(true);
    expect(OG.ogHumanizeDrumEvents(project, pattern.id, drums.id, { amountTicks: 12, velocityAmount: 0.02, seed: 'fixed' })).toBe(3);
    const nudges = pattern.events.map(event => event.microtimingTicks);
    expect(nudges.some(nudge => nudge !== 0)).toBe(true);
    expect(OG.ogBuildProjectStorageReport(project).humanizedHitCount).toBe(3);
    expect(OG.ogClearPadEvents(project, pattern.id, drums.id, 'pad_1')).toBe(2);
    expect(pattern.events.map(event => event.padId)).toEqual(['pad_2']);
  });

  it('writes drum groove styles without overwriting manual hits', () => {
    const project = OG.ogCreateProject({ title: 'Beat Lesson' });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const manual = OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true, velocity: 0.99 });
    const styles = OG.ogListDrumGrooveStyles();
    expect(styles.map(style => style.name)).toContain('Boom Bap');

    const groove = OG.ogWriteDrumGroove(project, pattern.id, drums.id, {
      style: 'boomBap',
      startBar: 0,
      bars: 1,
      seed: 'groove-1',
      humanizeTicks: 0
    });
    expect(groove.styleName).toBe('Boom Bap');
    expect(groove.hitCount).toBeGreaterThan(0);
    expect(groove.skippedCount).toBe(1);
    expect(manual.role).toBeUndefined();
    expect(manual.velocity).toBe(0.99);
    expect(groove.events.every(event => event.role === 'groove' && event.source === 'grooveWriter')).toBe(true);
    expect(OG.ogBuildProjectStorageReport(project).grooveHitCount).toBe(groove.hitCount);

    const rewritten = OG.ogWriteDrumGroove(project, pattern.id, drums.id, {
      style: 'boomBap',
      startBar: 0,
      bars: 1,
      seed: 'groove-1',
      humanizeTicks: 0
    });
    expect(pattern.events.filter(event => event.role === 'groove')).toHaveLength(rewritten.hitCount);
    expect(pattern.events).toHaveLength(rewritten.hitCount + 1);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('keeps performance timing separate from notation timing', () => {
    const project = OG.ogCreateProject();
    const synth = project.tracks[1];
    const pattern = project.patterns[0];
    const note = OG.ogAppendEvent(project, pattern.id, {
      type: 'note',
      trackId: synth.id,
      pitch: 'Eb4',
      startTick: 1931,
      durationTicks: 477,
      notationStartTick: 1920,
      notationDurationTicks: 480,
      velocity: 0.7
    });
    expect(note.midi).toBe(63);
    expect(note.startTick).toBe(1931);
    expect(note.notation.startTick).toBe(1920);
    expect(note.notation.durationTicks).toBe(480);
    expect(note.notation.spelling).toBe('Eb4');
  });

  it('toggles synth note steps and exposes notation preview by measure', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const note = OG.ogSetNoteStep(project, pattern.id, synth.id, 'Bb3', 17, 16, { on: true });
    expect(note.pitch).toBe('Bb3');
    expect(note.midi).toBe(58);
    expect(note.startTick).toBe(OG.ogTicksPerMeasure(project) + (OG.ogTicksPerMeasure(project) / 16));
    const preview = OG.ogBuildNotationPreview(project, pattern.id);
    expect(preview.measures[1].notes).toHaveLength(1);
    expect(preview.measures[1].notes[0]).toMatchObject({ pitch: 'Bb3', startBeat: 1.25, durationBeats: 0.25 });
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'Bb3', 17, 16, { on: false });
    expect(OG.ogBuildNotationPreview(project, pattern.id).notes).toHaveLength(0);
  });

  it('stores normalized synth patch controls on synth tracks', () => {
    const project = OG.ogCreateProject();
    const synth = project.tracks[1];
    const patch = OG.ogSetSynthInstrument(project, synth.id, {
      oscillator: 'square',
      filter: { type: 'bandpass', cutoff: 24000, q: 3.4 },
      envelope: { attack: 0.2, sustain: 0.35, release: 9 }
    });
    expect(patch).toMatchObject({
      oscillator: 'square',
      filter: { type: 'bandpass', cutoff: 18000, q: 3.4 },
      envelope: { attack: 0.2, sustain: 0.35, release: 5 }
    });
    expect(OG.ogBuildSynthPatchSummary(project, synth.id)).toMatchObject({ oscillator: 'square', filterType: 'bandpass', cutoff: 18000 });
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('applies named synth presets and deterministic generated patches', () => {
    const projectA = OG.ogCreateProject({ title: 'Patch Lesson' });
    const projectB = OG.ogCreateProject({ title: 'Patch Lesson' });
    const synthA = projectA.tracks[1];
    const synthB = projectB.tracks[1];

    const presets = OG.ogListSynthPatchPresets();
    expect(presets.map(preset => preset.name)).toContain('Warm Bass');
    expect(presets.map(preset => preset.name)).toContain('Classic Piano');
    expect(OG.ogGetSynthPatchPreset('classicPiano').instrument.partials.length).toBeGreaterThan(1);
    const presetPatch = OG.ogApplySynthPatchPreset(projectA, synthA.id, 'glassPluck');
    expect(presetPatch).toMatchObject({
      name: 'Glass Pluck',
      presetId: 'glassPluck',
      oscillator: 'triangle',
      filter: { type: 'bandpass' }
    });
    expect(OG.ogBuildSynthPatchSummary(projectA, synthA.id)).toMatchObject({
      patchName: 'Glass Pluck',
      presetId: 'glassPluck'
    });

    const generatedA = OG.ogRandomizeSynthInstrument(projectA, synthA.id, { seed: 'lesson-1' });
    const generatedB = OG.ogRandomizeSynthInstrument(projectB, synthB.id, { seed: 'lesson-1' });
    expect(generatedA).toEqual(generatedB);
    expect(generatedA).toMatchObject({ name: 'Generated Patch', presetId: 'generated' });
    expect(OG.ogValidateProject(projectA)).toEqual([]);
    expect(OG.ogValidateProject(projectB)).toEqual([]);
  });

  it('exports a simple MusicXML sketch from notation events', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'Eb4', 0, 16, { on: true });
    const xml = OG.ogBuildMusicXmlSketch(project, pattern.id, synth.id);
    expect(xml).toContain('<score-partwise version="3.1">');
    expect(xml).toContain('<step>E</step><alter>-1</alter><octave>4</octave>');
    expect(xml).toContain('<divisions>960</divisions>');
  });

  it('exports a standard MIDI file with pitched notes and drum hits', () => {
    const project = OG.ogCreateProject({ bpm: 120, ppq: 960 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];
    OG.ogAppendEvent(project, pattern.id, { type: 'note', trackId: synth.id, pitch: 'C4', startTick: 0, durationTicks: 960, velocity: 1 });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_2', 4, 16, { on: true, velocity: 0.9 });
    const midi = OG.ogBuildMidiFile(project, pattern.id);
    const bytes = Array.from(midi);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    expect(String.fromCharCode(...bytes.slice(14, 18))).toBe('MTrk');
    expect(bytes[12]).toBe(3);
    expect(bytes[13]).toBe(192);
    expect(bytes).toContain(0x90);
    expect(bytes).toContain(60);
    expect(bytes).toContain(0x99);
    expect(bytes).toContain(38);
  });

  it('builds scales, chords, and chord progressions as structured composition data', () => {
    const project = OG.ogCreateProject({ tonic: 'C', mode: 'minor' });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    expect(OG.ogBuildScale('C', 'minor')).toEqual(['C', 'D', 'D#', 'F', 'G', 'G#', 'A#']);
    expect(OG.ogBuildChord('Eb', 'major', 3)).toMatchObject({ root: 'Eb', quality: 'major', symbol: 'Eb' });
    const created = OG.ogApplyChordProgression(project, pattern.id, synth.id, [
      { root: 'C', quality: 'minor' },
      { root: 'Eb', quality: 'major' },
      { root: 'Bb', quality: 'major' },
      { root: 'G', quality: 'minor' }
    ], { barsPerChord: 1, octave: 3, writeNotes: true });
    expect(created.filter(event => event.type === 'chord')).toHaveLength(4);
    expect(created.filter(event => event.type === 'note')).toHaveLength(12);
    const preview = OG.ogBuildNotationPreview(project, pattern.id);
    expect(preview.measures.map(measure => measure.chords[0].symbol)).toEqual(['Cm', 'Eb', 'Bb', 'Gm']);
    const names = OG.ogBuildCompositionNomenclature(project, pattern.id);
    expect(names).toMatchObject({ keyName: 'C Minor' });
    expect(names.scaleDegrees.map(degree => degree.note)).toEqual(['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb']);
    expect(names.scaleDegrees.map(degree => degree.roman)).toEqual(['i', 'iidim', 'III', 'iv', 'v', 'VI', 'VII']);
    expect(names.measures.map(measure => measure.chords[0].roman)).toEqual(['i', 'III', 'VII', 'v']);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('writes notation-style text input into notation-timed note events', () => {
    const project = OG.ogCreateProject({ tonic: 'C', mode: 'minor' });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const written = OG.ogWriteNotationInput(project, pattern.id, synth.id, 'C4:q D4:e R:e [Eb4+G4]:h | Bb4/4', {
      startBar: 0,
      replace: true
    });
    expect(written.noteCount).toBe(5);
    expect(written.warnings).toEqual([]);

    const preview = OG.ogBuildCompositionNomenclature(project, pattern.id);
    expect(preview.measures[0].notes.map(note => note.pitch)).toEqual(['C4', 'D4', 'Eb4', 'G4']);
    expect(preview.measures[0].notes.find(note => note.pitch === 'D4')).toMatchObject({ durationBeats: 0.5, solfege: 'Re' });
    expect(preview.measures[1].notes[0]).toMatchObject({ pitch: 'Bb4', solfege: 'Ti' });
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('builds an editable engraved staff model for notation-first composition', () => {
    const project = OG.ogCreateProject({ tonic: 'C', mode: 'minor' });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const emptyStaff = OG.ogBuildStaffEngraving(project, pattern.id, { trackId: synth.id, selectedBar: 0 });
    expect(emptyStaff).toMatchObject({ clef: 'treble', keyName: 'C Minor', slotsPerMeasure: 8 });
    expect(emptyStaff.measures[0].slots).toHaveLength(8);
    expect(emptyStaff.measures[0].selected).toBe(true);

    const written = OG.ogSetStaffNote(project, pattern.id, synth.id, {
      startBar: 0,
      startBeat: 1.5,
      pitch: 'C4',
      duration: 'e',
      replaceSlot: true
    });
    expect(written.event).toMatchObject({
      pitch: 'C4',
      startTick: 480,
      durationTicks: 480,
      role: 'notation',
      source: 'staffEditor'
    });

    const staff = OG.ogBuildStaffEngraving(project, pattern.id, { trackId: synth.id, selectedBar: 0 });
    const note = staff.measures[0].notes.find(item => item.pitch === 'C4');
    expect(note).toMatchObject({
      startBeat: 1.5,
      durationName: 'eighth',
      accidental: '',
      stem: true
    });
    expect(note.y).toBeGreaterThan(staff.geometry.bottomY);
    expect(note.ledgerLines.length).toBeGreaterThan(0);

    const rest = OG.ogSetStaffNote(project, pattern.id, synth.id, {
      startBar: 0,
      startBeat: 1.5,
      tool: 'rest',
      rest: true
    });
    expect(rest).toMatchObject({ rest: true, removed: 1 });
    expect(OG.ogBuildStaffEngraving(project, pattern.id, { trackId: synth.id }).measures[0].notes).toHaveLength(0);
  });

  it('writes scale-aware melody phrases as notation-safe events', () => {
    const project = OG.ogCreateProject({ title: 'Melody Lesson', tonic: 'C', mode: 'minor' });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    OG.ogApplyChordProgression(project, pattern.id, synth.id, [
      { root: 'C', quality: 'minor' },
      { root: 'Eb', quality: 'major' }
    ], { barsPerChord: 1, octave: 3, writeNotes: false });

    const phrase = OG.ogWriteMelodyPhrase(project, pattern.id, synth.id, {
      style: 'callResponse',
      startBar: 0,
      bars: 2,
      seed: 'phrase-1',
      octave: 4
    });
    const scalePitchClasses = OG.ogBuildScale('C', 'minor').map(note => OG.ogNoteNameToMidi(note + '4') % 12);
    expect(phrase.styleName).toBe('Call / Response');
    expect(phrase.noteCount).toBeGreaterThan(0);
    expect(phrase.events.every(event => event.role === 'melody' && event.source === 'phrase')).toBe(true);
    expect(phrase.events.every(event => scalePitchClasses.includes(event.midi % 12))).toBe(true);
    expect(OG.ogBuildNotationPreview(project, pattern.id).notes.some(note => note.role === 'melody')).toBe(true);

    const rewritten = OG.ogWriteMelodyPhrase(project, pattern.id, synth.id, {
      style: 'callResponse',
      startBar: 0,
      bars: 2,
      seed: 'phrase-1',
      octave: 4
    });
    expect(pattern.events.filter(event => event.role === 'melody')).toHaveLength(rewritten.noteCount);
    expect(pattern.events.filter(event => event.type === 'chord')).toHaveLength(2);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('duplicates patterns with new pattern and event ids', () => {
    const project = OG.ogMakeDemoProject({ now: 1 });
    const source = project.patterns[0];
    const copy = OG.ogDuplicatePattern(project, source.id, 'Copy');
    expect(copy.id).not.toBe(source.id);
    expect(copy.events.length).toBe(source.events.length);
    expect(copy.events[0].id).not.toBe(source.events[0].id);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('copies and clears bars while preserving notation timing', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];
    const measure = OG.ogTicksPerMeasure(project);
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true, velocity: 0.9 });
    const note = OG.ogSetNoteStep(project, pattern.id, synth.id, 'C4', 2, 16, { on: true });
    expect(note.startTick).toBe(480);
    expect(note.notation.startTick).toBe(480);

    const created = OG.ogCopyBar(project, pattern.id, 0, 1, { replace: true });
    expect(created).toHaveLength(2);
    expect(created.map(event => event.startTick).sort((a, b) => a - b)).toEqual([measure, measure + 480]);
    const copiedNote = created.find(event => event.type === 'note');
    expect(copiedNote.id).not.toBe(note.id);
    expect(copiedNote.notation.startTick).toBe(measure + 480);
    expect(OG.ogBuildNotationPreview(project, pattern.id).measures[1].notes[0]).toMatchObject({ pitch: 'C4', startBeat: 1.5 });

    expect(OG.ogClearBar(project, pattern.id, 1)).toBe(2);
    expect(pattern.events.every(event => event.startTick < measure)).toBe(true);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('creates scenes and builds an arrangement timeline', () => {
    const project = OG.ogMakeDemoProject();
    const source = project.patterns[0];
    const variation = OG.ogDuplicatePattern(project, source.id, 'Variation');
    const scene = OG.ogAddScene(project, { name: 'Scene 2', patternIds: [variation.id] });
    const section = OG.ogAddArrangementSection(project, scene.id, { startBar: 5, bars: 4, label: 'B section' });
    expect(section).toMatchObject({ sceneId: scene.id, startBar: 5, bars: 4, label: 'B section' });
    const timeline = OG.ogBuildArrangementTimeline(project);
    expect(timeline).toHaveLength(2);
    expect(timeline[1]).toMatchObject({
      sceneId: scene.id,
      sceneName: 'Scene 2',
      label: 'B section',
      patternIds: [variation.id],
      startBar: 5,
      endBar: 8,
      startTick: OG.ogTicksPerMeasure(project) * 4
    });
    expect(OG.ogNextArrangementStartBar(project)).toBe(9);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('reports starter path readiness from project data', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];
    let status = OG.ogBuildOnboardingStatus(project, pattern.id);
    expect(status).toMatchObject({ beatReady: false, harmonyReady: false, variationReady: false, songReady: true, sampleReady: false, exportReady: true });
    expect(OG.ogBuildOnboardingGuidance(project, pattern.id)).toMatchObject({
      stepId: 'beat',
      title: 'Beat',
      actionId: 'beat',
      actionLabel: 'Make Beat',
      completed: false
    });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true });
    expect(OG.ogBuildOnboardingGuidance(project, pattern.id)).toMatchObject({
      stepId: 'harmony',
      actionId: 'harmony',
      actionLabel: 'Add Harmony'
    });
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'C4', 0, 16, { on: true });
    OG.ogDuplicatePattern(project, pattern.id, 'Variation');
    const asset = OG.ogRegisterUserRecording(project, { name: 'Tap' });
    OG.ogAssignAssetToPad(project, drums.id, 'pad_6', asset.id);
    status = OG.ogBuildOnboardingStatus(project, pattern.id);
    expect(status).toMatchObject({ beatReady: true, harmonyReady: true, variationReady: true, songReady: true, sampleReady: true, exportReady: true });
    expect(status.completed).toBe(6);
    expect(OG.ogBuildOnboardingGuidance(project, pattern.id)).toMatchObject({
      stepId: 'complete',
      title: 'Session Ready',
      actionId: 'export',
      actionLabel: 'Prepare JSON',
      completed: true,
      completedCount: 6
    });
  });

  it('builds license reports without blocking local project validation', () => {
    const project = OG.ogCreateProject();
    OG.ogAddAsset(project, { name: 'Field Recording', license: 'User Owned', type: 'recording' });
    OG.ogAddAsset(project, { name: 'Mystery Loop', license: 'Unknown', type: 'sample' });
    const report = OG.ogBuildLicenseReport(project);
    expect(report.assetCount).toBe(2);
    expect(report.exportSafe).toBe(false);
    expect(report.warnings[0]).toMatch(/Mystery Loop/);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('prepares rights-aware stem separation slots without requiring an ML engine', () => {
    const project = OG.ogCreateProject({ title: 'Stem Lesson' });
    const source = OG.ogAddAsset(project, { name: 'Class Mix', license: 'Unknown', type: 'loop' });
    const riskyPlan = OG.ogBuildStemSeparationPlan(project, { mode: 'four', sourceAssetId: source.id });
    expect(riskyPlan).toMatchObject({
      mode: 'four',
      label: '4-stem',
      sourceAssetId: source.id,
      rightsSafe: false,
      recommendedEngineId: 'external-demucs'
    });
    expect(riskyPlan.targets).toEqual(['vocals', 'drums', 'bass', 'other']);
    expect(riskyPlan.warnings[0]).toMatch(/Confirm rights/);

    const prepared = OG.ogPrepareStemSlots(project, {
      mode: 'six',
      sourceAssetId: source.id,
      userConfirmedRights: true,
      prefix: 'Class Mix'
    });
    expect(prepared.plan.targets).toEqual(['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']);
    expect(prepared.assets).toHaveLength(6);
    expect(prepared.assets.every(asset => asset.license === 'User Owned' && asset.type === 'loop')).toBe(true);
    expect(prepared.assets.map(asset => asset.stemRole)).toEqual(['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']);
    expect(OG.ogBuildStemAssetSummary(project)[0]).toMatchObject({
      groupId: prepared.groupId,
      count: 6,
      readyCount: 0
    });
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('scores optional stem engines by setup and machine requirements', () => {
    const manual = OG.ogBuildStemEngineReadiness({ engineId: 'manual-import', mode: 'six' });
    expect(manual).toMatchObject({
      engineId: 'manual-import',
      tier: 'ready',
      tierLabel: 'Ready'
    });

    const blockedDemucs = OG.ogBuildStemEngineReadiness({
      engineId: 'external-demucs',
      mode: 'four',
      capabilities: { cpuCores: 8, memoryGb: 16, gpuVramGb: 8 }
    });
    expect(blockedDemucs.tier).toBe('blocked');
    expect(blockedDemucs.requirements.find(req => req.id === 'local-worker')).toMatchObject({
      met: false,
      severity: 'blocker'
    });

    const readyDemucs = OG.ogBuildStemEngineReadiness({
      engineId: 'demucs',
      mode: 'six',
      capabilities: { localWorkerInstalled: true, cpuCores: 8, memoryGb: 16, gpuVramGb: 8 }
    });
    expect(readyDemucs).toMatchObject({
      engineId: 'external-demucs',
      tier: 'ready'
    });

    const unsupportedSpleeter = OG.ogBuildStemEngineReadiness({
      engineId: 'spleeter',
      mode: 'six',
      capabilities: { localWorkerInstalled: true, cpuCores: 8, memoryGb: 16 }
    });
    expect(unsupportedSpleeter.tier).toBe('blocked');
    expect(unsupportedSpleeter.requirements.find(req => req.id === 'mode-support')).toMatchObject({
      met: false,
      severity: 'blocker'
    });

    const browserBlocked = OG.ogBuildStemEngineReadiness({
      engineId: 'browser-onnx',
      mode: 'four',
      capabilities: { webgpu: false, memoryGb: 16 }
    });
    expect(browserBlocked.tier).toBe('blocked');
    expect(browserBlocked.requirements.find(req => req.id === 'webgpu')).toMatchObject({ met: false });
  });

  it('registers user-owned recordings and assigns them to pads without attribution debt', () => {
    const project = OG.ogCreateProject();
    const drums = project.tracks[0];
    const recording = OG.ogRegisterUserRecording(project, { name: 'Desk Tap', mimeType: 'audio/webm', sizeBytes: 2048 });
    const pad = OG.ogAssignAssetToPad(project, drums.id, 'pad_5', recording.id);
    expect(recording).toMatchObject({ type: 'recording', license: 'User Owned', localOnly: true });
    expect(pad).toMatchObject({ id: 'pad_5', assetId: recording.id, engine: 'sample', name: 'Desk Tap' });
    expect(OG.ogBuildLicenseReport(project)).toMatchObject({ assetCount: 1, exportSafe: true });
    expect(OG.ogBuildAttributionText(project)).toBe('No attribution-required assets.');
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('supports embedded user sample data and lightweight project serialization', () => {
    const project = OG.ogCreateProject();
    const embeddedAudio = 'data:audio/webm;base64,QUJDRA==';
    const recording = OG.ogRegisterUserRecording(project, {
      name: 'Embedded Tap',
      mimeType: 'audio/webm',
      dataUrl: embeddedAudio
    });
    expect(recording.storage).toBe('embedded');
    expect(recording.dataUrl).toBe(embeddedAudio);
    expect(recording.sizeBytes).toBe(4);
    expect(OG.ogIsSafeAudioDataUrl(embeddedAudio)).toBe(true);
    expect(OG.ogBuildProjectStorageReport(project)).toMatchObject({ assetCount: 1, embeddedCount: 1, embeddedBytes: 4 });
    expect(OG.ogSerializeProject(project)).toContain(embeddedAudio);
    const thin = OG.ogSerializeProject(project, { includeEmbeddedAudio: false });
    expect(thin).not.toContain(embeddedAudio);
    expect(thin).toContain('embeddedAudioOmitted');
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('stores trim regions and chops one source sample across pads', () => {
    const project = OG.ogCreateProject();
    const drums = project.tracks[0];
    const asset = OG.ogRegisterUserRecording(project, { name: 'Loop', durationSec: 2 });
    OG.ogAssignAssetToPad(project, drums.id, 'pad_1', asset.id);
    const trimmed = OG.ogSetPadSampleRegion(project, drums.id, 'pad_1', { startSec: 0.25, endSec: 0.75, label: 'Tight' });
    expect(trimmed.sampleRegion).toMatchObject({ startSec: 0.25, endSec: 0.75, durationSec: 0.5, label: 'Tight' });
    const slices = OG.ogChopAssetToPads(project, drums.id, asset.id, { startPadId: 'pad_5', slices: 4, startSec: 0, endSec: 2 });
    expect(slices.map(pad => pad.id)).toEqual(['pad_5', 'pad_6', 'pad_7', 'pad_8']);
    expect(slices.map(pad => pad.sampleRegion.startSec)).toEqual([0, 0.5, 1, 1.5]);
    expect(OG.ogBuildProjectStorageReport(project).slicedPadCount).toBe(5);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('rejects unsafe embedded asset URLs during validation', () => {
    const project = OG.ogCreateProject();
    OG.ogAddAsset(project, { name: 'Bad Embed', license: 'User Owned', dataUrl: 'data:text/html;base64,PHNjcmlwdA==' });
    expect(OG.ogValidateProject(project)[0]).toMatch(/unsafe embedded audio URL/);
  });

  it('prepares attribution notes for CC BY assets', () => {
    const project = OG.ogCreateProject({ title: 'Credit Test' });
    OG.ogAddAsset(project, {
      name: 'Open Clap',
      license: 'CC-BY-4.0',
      attributionRequired: true,
      creator: 'Sample Artist',
      originalUrl: 'https://example.test/open-clap.wav'
    });
    const report = OG.ogBuildLicenseReport(project);
    expect(report.exportSafe).toBe(false);
    expect(report.warnings[0]).toMatch(/requires attribution/);
    expect(OG.ogBuildAttributionText(project)).toContain('Open Clap by Sample Artist - CC-BY-4.0');
  });
});

describe('Open Groove scheduler', () => {
  it('turns pattern events into sorted playback times', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];
    OG.ogSetSynthInstrument(project, synth.id, { oscillator: 'triangle', filter: { cutoff: 2200 } });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_2', 4, 16, { on: true });
    OG.ogAppendEvent(project, pattern.id, { type: 'note', trackId: synth.id, pitch: 'C3', startTick: 0, durationTicks: 960 });
    const plan = OS.ogBuildPlaybackPlan(project, { patternId: pattern.id, originTime: 10 });
    expect(plan.map(item => item.type)).toEqual(['note', 'drumHit']);
    expect(plan[0].time).toBeCloseTo(10, 4);
    expect(plan[0].instrument).toMatchObject({ oscillator: 'triangle', filter: { cutoff: 2200 } });
    expect(plan[1].time).toBeCloseTo(10.5, 4);
  });

  it('builds loop plans across the pattern wrap point', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true });
    const length = OG.ogPatternLengthTicks(project, pattern.id);
    const plan = OS.ogBuildLoopPlaybackPlan(project, {
      patternId: pattern.id,
      transportTick: length - 120,
      lookaheadTicks: 300
    });
    expect(plan.length).toBe(1);
    expect(plan[0].scheduledTick).toBe(length);
    expect(plan[0].loopIndex).toBe(1);
  });

  it('applies project swing to off-step playback timing', () => {
    const project = OG.ogCreateProject({ bpm: 120, swing: 0.5 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 1, 16, { on: true });
    const stepTicks = OS.ogStepTicks(project, 16);
    const plan = OS.ogBuildPlaybackPlan(project, { patternId: pattern.id });
    expect(stepTicks).toBe(240);
    expect(plan[0].patternTick).toBe(240);
    expect(plan[0].playTick).toBe(300);
    expect(plan[0].time).toBeCloseTo(0.15625, 5);
  });

  it('carries sample pad metadata into playback plans', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const asset = OG.ogRegisterUserRecording(project, { name: 'Snap' });
    OG.ogAssignAssetToPad(project, drums.id, 'pad_5', asset.id);
    OG.ogSetPadSampleRegion(project, drums.id, 'pad_5', { startSec: 0.1, endSec: 0.35 });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_5', 0, 16, { on: true });
    const plan = OS.ogBuildPlaybackPlan(project, { patternId: pattern.id });
    expect(plan[0]).toMatchObject({ padId: 'pad_5', padEngine: 'sample', assetId: asset.id, sampleRegion: { startSec: 0.1, endSec: 0.35 } });
  });

  it('honors mixer mute, solo, and gain in playback plans', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true, velocity: 1 });
    OG.ogAppendEvent(project, pattern.id, { type: 'note', trackId: synth.id, pitch: 'C4', startTick: 0, durationTicks: 960, velocity: 1 });

    OG.ogSetMixerChannel(project, drums.id, { mute: true });
    expect(OS.ogBuildPlaybackPlan(project, { patternId: pattern.id }).map(item => item.type)).toEqual(['note']);

    OG.ogSetMixerChannel(project, drums.id, { mute: false, solo: true, gain: 0.5 });
    const soloPlan = OS.ogBuildPlaybackPlan(project, { patternId: pattern.id });
    expect(soloPlan.map(item => item.type)).toEqual(['drumHit']);
    expect(soloPlan[0]).toMatchObject({ channelGain: 0.5, masterGain: 0.9, outputGain: 0.45 });
    expect(soloPlan[0].velocity).toBeCloseTo(0.45, 5);
    expect(OG.ogBuildMixerSnapshot(project).channels.find(channel => channel.trackId === drums.id)).toMatchObject({ solo: true, audible: true });
  });

  it('stores track effect racks and automation lane snapshots', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];

    const delay = OG.ogSetTrackEffect(project, synth.id, 'delay', {
      params: { mix: 0.4, time: 0.33, feedback: 0.5 }
    });
    expect(delay).toMatchObject({ type: 'delay', enabled: true, params: { mix: 0.4, time: 0.33, feedback: 0.5 } });
    expect(OG.ogGetTrackEffects(project, synth.id)).toHaveLength(1);
    expect(OG.ogBuildEffectRack(project, synth.id).find(effect => effect.type === 'delay')).toMatchObject({ enabled: true });

    const point = OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'effect.delay.mix', 8, 16, 0.75);
    expect(point).toMatchObject({ type: 'automationPoint', target: 'effect.delay.mix', value: 0.75 });
    const lane = OG.ogBuildAutomationLane(project, pattern.id, synth.id, 'effect.delay.mix');
    expect(lane.points).toHaveLength(1);
    expect(OG.ogBuildAutomationSnapshot(project, pattern.id, synth.id).pointCount).toBe(1);
    expect(OG.ogBuildMixerSnapshot(project).channels.find(channel => channel.trackId === synth.id).effectCount).toBe(1);
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('resolves effect and mixer automation into playback plans', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    OG.ogSetTrackEffect(project, synth.id, 'delay', { params: { mix: 0.1 } });
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'C4', 0, 16, { on: true, velocity: 1 });
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'G4', 8, 16, { on: true, velocity: 1 });
    OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'effect.delay.mix', 8, 16, 0.8);
    OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'mixer.gain', 8, 16, 0.5);

    const notes = OS.ogBuildPlaybackPlan(project, { patternId: pattern.id }).filter(item => item.type === 'note');
    expect(notes).toHaveLength(2);
    expect(notes[0].effects.find(effect => effect.type === 'delay').params.mix).toBeCloseTo(0.1, 5);
    expect(notes[1].effects.find(effect => effect.type === 'delay').params.mix).toBeCloseTo(0.8, 5);
    expect(notes[0].outputGain).toBeCloseTo(0.675, 5);
    expect(notes[1].outputGain).toBeCloseTo(0.45, 5);
  });

  it('interpolates linear automation curves and holds stepped curves', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];

    OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'effect.delay.mix', 0, 16, 0.2, { curve: 'linear' });
    OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'effect.delay.mix', 8, 16, 0.8);
    expect(OG.ogResolveAutomationValueAtTick(project, pattern.id, synth.id, 'effect.delay.mix', OG.ogTicksPerMeasure(project) / 4, 0)).toBeCloseTo(0.5, 5);

    OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'effect.delay.feedback', 0, 16, 0.2, { curve: 'hold' });
    OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'effect.delay.feedback', 8, 16, 0.8);
    expect(OG.ogResolveAutomationValueAtTick(project, pattern.id, synth.id, 'effect.delay.feedback', OG.ogTicksPerMeasure(project) / 4, 0)).toBeCloseTo(0.2, 5);

    OG.ogSetNoteStep(project, pattern.id, synth.id, 'E4', 4, 16, { on: true, velocity: 1 });
    const note = OS.ogBuildPlaybackPlan(project, { patternId: pattern.id }).find(item => item.type === 'note');
    const delay = note.effects.find(effect => effect.type === 'delay');
    expect(delay.params.mix).toBeCloseTo(0.5, 5);
    expect(delay.params.feedback).toBeCloseTo(0.2, 5);
  });

  it('builds playback plans from song arrangement sections', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true });
    const variation = OG.ogDuplicatePattern(project, pattern.id, 'Variation');
    const scene = OG.ogAddScene(project, { name: 'Scene 2', patternIds: [variation.id] });
    OG.ogAddArrangementSection(project, scene.id, { startBar: 5, bars: 4 });
    const plan = OS.ogBuildArrangementPlaybackPlan(project);
    expect(plan.length).toBeGreaterThanOrEqual(2);
    expect(plan[0]).toMatchObject({ sceneId: project.scenes[0].id, patternId: pattern.id, arrangementTick: 0 });
    expect(plan.find(item => item.sceneId === scene.id)).toMatchObject({
      patternId: variation.id,
      arrangementTick: OG.ogTicksPerMeasure(project) * 4,
      time: 8
    });
  });
});

describe('Open Groove browser wrappers', () => {
  it('registers the standalone UI module and carries pure helpers for tests', () => {
    expect(typeof UI).toBe('function');
    expect(UI.OPEN_GROOVE_META.category).toBe('learning');
    expect(UI.ogCreateProject).toBe(OG.ogCreateProject);
    expect(UI.ogBuildPlaybackPlan).toBe(OS.ogBuildPlaybackPlan);
  });

  it('fails audio creation gracefully when Web Audio is unavailable', () => {
    expect(OA.ogHasAudioContext()).toBe(false);
    expect(OA.ogCanRecordAudio()).toBe(false);
    const engine = OA.ogCreateAudioEngine();
    expect(engine.available).toBe(false);
    expect(engine.reason).toMatch(/Web Audio/);
    expect(OA.ogPlaySample(engine, 'missing')).toBe(false);
  });
});
