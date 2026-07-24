import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let OG;
let OS;
let OA;
let UI;

function countByteSequence(bytes, sequence) {
  let count = 0;
  for (let i = 0; i <= bytes.length - sequence.length; i += 1) {
    if (sequence.every((value, index) => bytes[i + index] === value)) count += 1;
  }
  return count;
}

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

  it('builds a playable keyboard layout and marks notes in the project key', () => {
    const project = OG.ogCreateProject({ tonic: 'C', mode: 'minor' });
    const layout = OG.ogBuildKeyboardLayout(project, { octave: 3, octaves: 2 });
    expect(layout).toMatchObject({ octave: 3, octaves: 2, keyName: 'C Minor', keyCount: 24 });
    expect(layout.keys[0]).toMatchObject({ pitch: 'C3', midi: 48, isBlack: false, inKey: true, computerKey: 'Z' });
    expect(layout.keys.find(key => key.pitch === 'C#3')).toMatchObject({ isBlack: true, inKey: false, computerKey: 'S' });
    expect(layout.keys.find(key => key.pitch === 'D#3')).toMatchObject({ isBlack: true, inKey: true });
  });

  it('builds diatonic keyboard triads with composition names', () => {
    const project = OG.ogCreateProject({ tonic: 'C', mode: 'minor' });
    const chord = OG.ogBuildKeyboardChord(project, 'C4');
    expect(chord).toMatchObject({
      root: 'C',
      rootPitch: 'C4',
      quality: 'minor',
      symbol: 'Cm',
      roman: 'i',
      nashville: '1',
      label: 'i / Cm'
    });
    expect(chord.pitches).toEqual(['C4', 'D#4', 'G4']);
    expect(chord.midi).toEqual([60, 63, 67]);
  });

  it('records keyboard notes with source metadata on grid steps', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const note = OG.ogSetNoteStep(project, pattern.id, synth.id, 'C4', 2, 16, {
      on: true,
      velocity: 0.64,
      role: 'keyboard',
      source: 'hardwareMidi'
    });
    expect(note).toMatchObject({
      pitch: 'C4',
      role: 'keyboard',
      source: 'hardwareMidi',
      velocity: 0.64
    });
    expect(OG.ogBuildNotationPreview(project, pattern.id).notes[0]).toMatchObject({ pitch: 'C4', startBeat: 1.5 });
  });

  it('stores normalized synth patch controls on synth tracks', () => {
    const project = OG.ogCreateProject();
    const synth = project.tracks[1];
    const patch = OG.ogSetSynthInstrument(project, synth.id, {
      oscillator: 'square',
      filter: { type: 'bandpass', cutoff: 24000, q: 3.4 },
      envelope: { attack: 0.2, sustain: 0.35, release: 9 },
      unison: { voices: 99, detune: 200, spread: 2 }
    });
    expect(patch).toMatchObject({
      oscillator: 'square',
      filter: { type: 'bandpass', cutoff: 18000, q: 3.4 },
      envelope: { attack: 0.2, sustain: 0.35, release: 5 },
      unison: { voices: 7, detune: 80, spread: 1 }
    });
    expect(OG.ogBuildSynthPatchSummary(project, synth.id)).toMatchObject({ oscillator: 'square', filterType: 'bandpass', cutoff: 18000, unisonVoices: 7 });
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
    expect(presets.map(preset => preset.name)).toContain('Wide Unison Lead');
    expect(presets.map(preset => preset.name)).toContain('FM Bell');
    expect(presets.map(preset => preset.name)).toContain('Solo Violin');
    expect(presets.map(preset => preset.name)).toContain('Flute');
    expect(presets.map(preset => preset.name)).toContain('Trumpet');
    expect(presets.map(preset => preset.name)).toEqual(expect.arrayContaining(['Harp', 'Classical Guitar', 'Choir Ah', 'Celesta']));
    const families = OG.ogListSynthPatchFamilies();
    expect(families.find(group => group.family === 'Strings').presets.map(preset => preset.id)).toContain('soloViolin');
    expect(families.find(group => group.family === 'Woodwinds').presets.map(preset => preset.id)).toContain('clarinet');
    expect(families.find(group => group.family === 'Brass').presets.map(preset => preset.id)).toContain('trombone');
    expect(families.find(group => group.family === 'Plucked Strings').presets.map(preset => preset.id)).toEqual(expect.arrayContaining(['harp', 'classicalGuitar']));
    expect(families.find(group => group.family === 'Voice').presets.map(preset => preset.id)).toContain('choirAh');
    const violinProfile = OG.ogBuildInstrumentProfile('soloViolin');
    expect(violinProfile).toMatchObject({
      name: 'Solo Violin',
      family: 'Strings',
      rangeLabel: 'G3-A7'
    });
    expect(violinProfile.samplePlan.articulations).toContain('sustain');
    expect(OG.ogListInstrumentProfiles().map(profile => profile.presetId)).toContain('trumpet');
    expect(OG.ogBuildInstrumentProfile('harp')).toMatchObject({
      family: 'Plucked Strings',
      role: 'harmony',
      roleLabel: 'Harmony',
      rangeLabel: 'C1-G7',
      samplePlan: { recommendedNotes: ['E2', 'A2', 'D3', 'G3', 'C4', 'E4'] }
    });
    expect(OG.ogBuildInstrumentProfile('choirAh')).toMatchObject({ family: 'Voice', roleLabel: 'Harmony', sourceLabel: 'Built-in choir-like synth', rangeLabel: 'C2-C6' });
    expect(OG.ogNormalizeInstrumentRole('Plucked Strings')).toBe('pluck');
    const roleGuides = OG.ogListInstrumentRoleGuides();
    expect(roleGuides.map(guide => guide.role)).toEqual(expect.arrayContaining(['bass', 'harmony', 'keys', 'melody', 'lead', 'pad', 'pluck', 'mallet']));
    const harmonyGuide = OG.ogBuildInstrumentRoleGuide('harmony');
    expect(harmonyGuide).toMatchObject({ label: 'Harmony', compositionTip: expect.stringContaining('middle register') });
    expect(harmonyGuide.starterPresetIds).toEqual(expect.arrayContaining(['harp', 'choirAh']));
    expect(harmonyGuide.presets.map(preset => preset.presetId)).toEqual(expect.arrayContaining(['harp', 'choirAh']));
    expect(OG.ogListInstrumentProfiles({ role: 'harmony' }).map(profile => profile.presetId)).toEqual(expect.arrayContaining(['harp', 'choirAh']));
    expect(OG.ogGetSynthPatchPreset('classicPiano').instrument.partials.length).toBeGreaterThan(1);
    expect(OG.ogGetSynthPatchPreset('wideUnisonLead').instrument).toMatchObject({
      engine: 'unison-layered-subtractive',
      unison: { voices: 5 }
    });
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
    const brassProject = OG.ogCreateProject({ title: 'Band Lesson' });
    const brassPatch = OG.ogApplySynthPatchPreset(brassProject, brassProject.tracks[1].id, 'trumpet');
    expect(brassPatch).toMatchObject({
      name: 'Trumpet',
      presetId: 'trumpet',
      oscillator: 'sawtooth',
      filter: { type: 'lowpass' }
    });
    const choirPatch = OG.ogApplySynthPatchPreset(brassProject, brassProject.tracks[1].id, 'choirAh');
    expect(choirPatch).toMatchObject({
      name: 'Choir Ah',
      presetId: 'choirAh',
      oscillator: 'sine',
      unison: { voices: 5 }
    });

    const generatedA = OG.ogRandomizeSynthInstrument(projectA, synthA.id, { seed: 'lesson-1' });
    const generatedB = OG.ogRandomizeSynthInstrument(projectB, synthB.id, { seed: 'lesson-1' });
    expect(generatedA).toEqual(generatedB);
    expect(generatedA).toMatchObject({ name: 'Generated Patch', presetId: 'generated' });
    expect(OG.ogValidateProject(projectA)).toEqual([]);
    expect(OG.ogValidateProject(projectB)).toEqual([]);
  });

  it('reports synth notes that fall outside the selected instrument range', () => {
    const project = OG.ogCreateProject({ title: 'Range Lesson' });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    OG.ogApplySynthPatchPreset(project, synth.id, 'flute');
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'B3', 0, 16, { on: true });
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'C4', 1, 16, { on: true });
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'E7', 2, 16, { on: true });

    const report = OG.ogBuildInstrumentRangeReport(project, pattern.id, synth.id);
    expect(report).toMatchObject({
      available: true,
      presetId: 'flute',
      instrumentName: 'Flute',
      rangeLabel: 'C4-D7',
      noteCount: 3,
      inRangeCount: 1,
      outOfRangeCount: 2,
      belowCount: 1,
      aboveCount: 1
    });
    expect(report.outOfRangeNotes.map(note => note.pitch)).toEqual(['B3', 'E7']);
    expect(report.summary).toContain('2 of 3 notes');

    const fit = OG.ogFitTrackNotesToInstrumentRange(project, pattern.id, synth.id);
    expect(fit).toMatchObject({ changedCount: 2, summary: '2 notes moved into Flute range.' });
    expect(fit.changes.map(change => [change.fromPitch, change.toPitch, change.semitones])).toEqual([
      ['B3', 'B4', 12],
      ['E7', 'E6', -12]
    ]);
    const fittedReport = OG.ogBuildInstrumentRangeReport(project, pattern.id, synth.id);
    expect(fittedReport).toMatchObject({ noteCount: 3, inRangeCount: 3, outOfRangeCount: 0 });
    expect(pattern.events.filter(event => event.type === 'note').map(event => event.notation.spelling)).toEqual(['B4', 'C4', 'E6']);
    expect(OG.ogBuildInstrumentRange('choirAh')).toMatchObject({ rangeLabel: 'C2-C6', lowMidi: 36, highMidi: 84 });

    const flutePalette = OG.ogBuildPlayablePitchPalette(project, 'flute', { centerPitch: 'C5', maxCount: 12 });
    expect(flutePalette).toMatchObject({ available: true, presetId: 'flute', rangeLabel: 'C4-D7' });
    expect(flutePalette.pitches).toHaveLength(12);
    expect(flutePalette.pitches.every(entry => entry.midi >= 60 && entry.midi <= 98 && entry.inRange)).toBe(true);

    const bassPalette = OG.ogBuildPlayablePitchPalette(project, 'roundSub', { centerPitch: 'C5', maxCount: 16 });
    expect(bassPalette).toMatchObject({ available: true, presetId: 'roundSub', rangeLabel: 'C1-C3' });
    expect(bassPalette.pitchNames).toContain('C3');
    expect(bassPalette.pitchNames).not.toContain('C4');
    expect(bassPalette.pitches.every(entry => entry.midi >= 24 && entry.midi <= 48)).toBe(true);

    const fallbackPalette = OG.ogBuildPlayablePitchPalette(project, null, { maxCount: 8 });
    expect(fallbackPalette).toMatchObject({ available: false, instrumentName: 'Default staff', rangeLabel: 'C4-C6' });
    expect(fallbackPalette.pitches).toHaveLength(8);
  });

  it('builds project-aware MusicXML key signatures', () => {
    expect(OG.ogBuildMusicXmlKeySignature(OG.ogCreateProject({ tonic: 'C', mode: 'minor' }))).toMatchObject({ fifths: -3, mode: 'minor', keyName: 'C Minor' });
    expect(OG.ogBuildMusicXmlKeySignature(OG.ogCreateProject({ tonic: 'E', mode: 'major' }))).toMatchObject({ fifths: 4, mode: 'major', keyName: 'E Major' });
    expect(OG.ogBuildMusicXmlKeySignature(OG.ogCreateProject({ tonic: 'Gb', mode: 'major' }))).toMatchObject({ fifths: -6, mode: 'major', keyName: 'Gb Major' });
    expect(OG.ogBuildMusicXmlKeySignature(OG.ogCreateProject({ tonic: 'D', mode: 'dorian' }))).toMatchObject({ fifths: 0, mode: 'dorian', keyName: 'D Dorian' });
  });
  it('builds VexFlow, MuseScore, and AI score bridge plans', () => {
    const project = OG.ogCreateProject({ title: 'Class Score', tonic: 'C', mode: 'minor', ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    OG.ogWriteNotationInput(project, pattern.id, synth.id, 'R:h [C4+E4]:q', { replace: true });

    const vexModel = OG.ogBuildVexFlowNotationModel(project, pattern.id, {
      trackId: synth.id,
      runtime: { Vex: { Flow: { Renderer: function Renderer() {} } } }
    });
    expect(vexModel).toMatchObject({ engine: 'vexflow', available: true, rendererStatus: 'ready', noteCount: 2, restCount: 5, chordCount: 1 });
    expect(vexModel.keySignature).toMatchObject({ fifths: -3, mode: 'minor' });
    expect(vexModel.measures[0].elements.map((entry) => entry.type)).toEqual(['rest', 'chord', 'rest']);
    expect(vexModel.measures[0].elements[0]).toMatchObject({ durationTicks: 1920, vexflow: { duration: 'hr' } });
    expect(vexModel.measures[0].elements[1].vexflow.keys).toEqual(['c/4', 'e/4']);

    const musePlan = OG.ogBuildMuseScoreBridgePlan(project, pattern.id, synth.id, {
      museScoreAvailable: true,
      includeXml: true,
      fileBaseName: 'Class Score'
    });
    expect(musePlan).toMatchObject({ engine: 'musescore', status: 'ready', files: { musicxml: 'Class-Score.musicxml', pdf: 'Class-Score.pdf' } });
    expect(musePlan.commands.some((command) => /MuseScore4\.exe/.test(command.command))).toBe(true);
    expect(musePlan.musicXml).toContain('<key><fifths>-3</fifths><mode>minor</mode></key>');

    const aiPlan = OG.ogBuildAudioToScoreAgentPlan(project, {
      capabilities: { basicPitchInstalled: true },
      license: 'User Owned'
    });
    expect(aiPlan).toMatchObject({ engine: 'basic-pitch', status: 'ready', rightsSafe: true });
    expect(aiPlan.phases.map((phase) => phase.id)).toEqual(['ingest', 'rights', 'beat-map', 'transcribe', 'quantize', 'refine']);
  });
  it('exports a clef-aware MusicXML sketch from notation events', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'Eb4', 0, 16, { on: true });
    const xml = OG.ogBuildMusicXmlSketch(project, pattern.id, synth.id);
    expect(xml).toContain('<score-partwise version="3.1">');
    expect(xml).toContain('<creator type="software">Open Groove Studio</creator>');
    expect(xml).toContain('<clef><sign>G</sign><line>2</line></clef>');
    expect(xml).toContain('<step>E</step><alter>-1</alter><octave>4</octave>');
    expect(xml).toContain('<divisions>960</divisions>');
    expect(xml).toContain('<key><fifths>-3</fifths><mode>minor</mode></key>');

    const bassProject = OG.ogCreateProject({ title: 'Bass XML' });
    const bassPattern = bassProject.patterns[0];
    const bassSynth = bassProject.tracks[1];
    OG.ogApplySynthPatchPreset(bassProject, bassSynth.id, 'roundSub');
    OG.ogSetStaffNote(bassProject, bassPattern.id, bassSynth.id, { startBar: 0, startBeat: 1, pitch: 'G2', duration: 'q' });
    const bassXml = OG.ogBuildMusicXmlSketch(bassProject, bassPattern.id, bassSynth.id, { clef: 'auto' });
    expect(bassXml).toContain('<work-title>Bass XML</work-title>');
    expect(bassXml).toContain('<key><fifths>-3</fifths><mode>minor</mode></key>');
    expect(bassXml).toContain('<clef><sign>F</sign><line>4</line></clef>');
    expect(bassXml).toContain('<step>G</step><octave>2</octave>');

    const forcedTrebleXml = OG.ogBuildMusicXmlSketch(bassProject, bassPattern.id, bassSynth.id, { clef: 'treble' });
    expect(forcedTrebleXml).toContain('<clef><sign>G</sign><line>2</line></clef>');
  });

  it('exports MusicXML rests and chord markers for offset staff notes', () => {
    const project = OG.ogCreateProject({ ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const written = OG.ogWriteNotationInput(project, pattern.id, synth.id, 'R:h [C4+E4]:q', { replace: true });
    expect(written.noteCount).toBe(2);

    const xml = OG.ogBuildMusicXmlSketch(project, pattern.id, synth.id);
    expect(xml).toContain('<rest/>\n        <duration>1920</duration>');
    expect(xml).toContain('<chord/>\n        <pitch><step>E</step><octave>4</octave></pitch>');

    const roundTripProject = OG.ogCreateProject({ ppq: 960 });
    const roundTripPattern = roundTripProject.patterns[0];
    const roundTripSynth = roundTripProject.tracks[1];
    const result = OG.ogImportMusicXmlSketch(roundTripProject, roundTripPattern.id, roundTripSynth.id, xml);
    const notes = roundTripPattern.events.filter((event) => event.type === 'note' && event.trackId === roundTripSynth.id);
    expect(result.noteCount).toBe(2);
    expect(notes.map((event) => event.pitch)).toEqual(['C4', 'E4']);
    expect(notes.map((event) => event.startTick)).toEqual([1920, 1920]);
    expect(notes.map((event) => event.durationTicks)).toEqual([960, 960]);
  });
  it('imports MusicXML notes, rests, and chords into notation events', () => {
    const project = OG.ogCreateProject({ ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lesson</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration></note>
      <note><rest/><duration>6</duration></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;
    const result = OG.ogImportMusicXmlSketch(project, pattern.id, synth.id, xml);
    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(result).toMatchObject({ noteCount: 3, measureCount: 2, partId: 'P1' });
    expect(pattern.bars).toBeGreaterThanOrEqual(2);
    expect(notes.map((event) => event.pitch)).toEqual(['C4', 'E4', 'G4']);
    expect(notes[0]).toMatchObject({ startTick: 0, durationTicks: 960, source: 'musicXmlImport', role: 'notation' });
    expect(notes[1]).toMatchObject({ startTick: 3840, durationTicks: 1920 });
    expect(notes[2]).toMatchObject({ startTick: 3840, durationTicks: 1920 });
  });

  it('imports MusicXML enharmonic and double accidentals with correct pitch', () => {
    const project = OG.ogCreateProject({ ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Accidentals</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>E</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>C</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>C</step><alter>2</alter><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>D</step><alter>-2</alter><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;
    const result = OG.ogImportMusicXmlSketch(project, pattern.id, synth.id, xml);
    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(result.noteCount).toBe(4);
    expect(notes.map((event) => event.pitch)).toEqual(['F4', 'B3', 'D4', 'C4']);
    expect(notes.map((event) => event.midi)).toEqual([65, 59, 62, 60]);
    expect(notes.map((event) => event.startTick)).toEqual([0, 960, 1920, 2880]);
  });
  it('applies imported MusicXML time signatures before placing later measures', () => {
    const project = OG.ogCreateProject({ ppq: 960, timeSignature: [4, 4] });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Meter Lesson</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>3</duration></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;
    const result = OG.ogImportMusicXmlSketch(project, pattern.id, synth.id, xml);
    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(result.timeSignature).toEqual([3, 4]);
    expect(project.timeSignature).toEqual([3, 4]);
    expect(OG.ogTicksPerMeasure(project)).toBe(2880);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ pitch: 'D4', startTick: 2880, durationTicks: 960 });
  });
  it('imports selected parts from score-timewise MusicXML files', () => {
    const project = OG.ogCreateProject({ ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-timewise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Bass</part-name></score-part>
  </part-list>
  <measure number="1">
    <part id="P1"><attributes><divisions>2</divisions></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration></note></part>
    <part id="P2"><attributes><divisions>2</divisions></attributes><note><pitch><step>F</step><octave>3</octave></pitch><duration>4</duration></note></part>
  </measure>
  <measure number="2">
    <part id="P1"><note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration></note></part>
    <part id="P2"><note><pitch><step>A</step><octave>3</octave></pitch><duration>2</duration></note></part>
  </measure>
</score-timewise>`;
    const result = OG.ogImportMusicXmlSketch(project, pattern.id, synth.id, xml, { partId: 'P2' });
    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(result).toMatchObject({ noteCount: 2, measureCount: 2, partId: 'P2' });
    expect(notes.map((event) => event.pitch)).toEqual(['F3', 'A3']);
    expect(notes.map((event) => event.startTick)).toEqual([0, 3840]);
    expect(notes.map((event) => event.durationTicks)).toEqual([1920, 960]);
  });
  it('keeps sparse score-timewise part timing when a selected part skips a measure', () => {
    const project = OG.ogCreateProject({ ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-timewise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Bass</part-name></score-part>
  </part-list>
  <measure number="1">
    <part id="P1"><attributes><divisions>2</divisions></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note></part>
  </measure>
  <measure number="2">
    <part id="P1"><note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration></note></part>
    <part id="P2"><attributes><divisions>2</divisions></attributes><note><pitch><step>A</step><octave>3</octave></pitch><duration>2</duration></note></part>
  </measure>
</score-timewise>`;
    const result = OG.ogImportMusicXmlSketch(project, pattern.id, synth.id, xml, { partId: 'P2' });
    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(result).toMatchObject({ noteCount: 1, measureCount: 2, partId: 'P2' });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ pitch: 'A3', startTick: 3840, durationTicks: 960 });
  });
  it('uses wrapper time signatures for sparse score-timewise selected parts', () => {
    const project = OG.ogCreateProject({ ppq: 960, timeSignature: [4, 4] });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-timewise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Bass</part-name></score-part>
  </part-list>
  <measure number="1">
    <part id="P1">
      <attributes><divisions>1</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>3</duration></note>
    </part>
  </measure>
  <measure number="2">
    <part id="P2">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>1</duration></note>
    </part>
  </measure>
</score-timewise>`;
    const result = OG.ogImportMusicXmlSketch(project, pattern.id, synth.id, xml, { partId: 'P2' });
    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(result).toMatchObject({ noteCount: 1, measureCount: 2, partId: 'P2', timeSignature: [3, 4] });
    expect(project.timeSignature).toEqual([3, 4]);
    expect(OG.ogTicksPerMeasure(project)).toBe(2880);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ pitch: 'A3', startTick: 2880, durationTicks: 960 });
  });
  it('merges tied MusicXML notes into one sustained notation event', () => {
    const project = OG.ogCreateProject({ ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Tie Lesson</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <tie type="start"/>
        <notations><tied type="start"/></notations>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>2</duration>
        <tie type="stop"/>
        <notations><tied type="stop"/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;
    const result = OG.ogImportMusicXmlSketch(project, pattern.id, synth.id, xml);
    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(result).toMatchObject({ noteCount: 1, measureCount: 2, tieMergeCount: 1 });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ pitch: 'C4', startTick: 0, durationTicks: 5760 });
    expect(notes[0].notation.tie).toMatchObject({ imported: true, start: true, stop: true, segments: 2 });
  });
  it('round-trips simple staff notation through MusicXML import', () => {
    const source = OG.ogCreateProject({ title: 'Round Trip XML' });
    const sourcePattern = source.patterns[0];
    const sourceSynth = source.tracks[1];
    OG.ogSetStaffNote(source, sourcePattern.id, sourceSynth.id, { startBar: 0, startBeat: 1, pitch: 'Bb4', duration: 'q' });
    OG.ogSetStaffNote(source, sourcePattern.id, sourceSynth.id, { startBar: 0, startBeat: 2, pitch: 'D5', duration: 'h' });
    const xml = OG.ogBuildMusicXmlSketch(source, sourcePattern.id, sourceSynth.id);

    const target = OG.ogCreateProject();
    const targetPattern = target.patterns[0];
    const targetSynth = target.tracks[1];
    const result = OG.ogImportMusicXmlSketch(target, targetPattern.id, targetSynth.id, xml);
    const imported = targetPattern.events.filter((event) => event.type === 'note' && event.trackId === targetSynth.id);
    expect(result.noteCount).toBe(2);
    expect(imported.map((event) => event.pitch)).toEqual(['Bb4', 'D5']);
    expect(imported.map((event) => event.startTick)).toEqual([0, 960]);
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

  it('exports an arrangement MIDI file with repeated song sections', () => {
    const project = OG.ogCreateProject({ bpm: 120, ppq: 960 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];
    OG.ogAppendEvent(project, pattern.id, { type: 'note', trackId: synth.id, pitch: 'C4', startTick: 0, durationTicks: 960, velocity: 1 });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true, velocity: 0.9 });
    project.arrangement = [];
    OG.ogAddArrangementSection(project, project.scenes[0].id, { startBar: 1, bars: 8, label: 'Two passes' });

    const midi = OG.ogBuildArrangementMidiFile(project);
    const bytes = Array.from(midi);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    expect(String.fromCharCode(...bytes.slice(14, 18))).toBe('MTrk');
    expect(countByteSequence(bytes, [0x90, 60])).toBe(2);
    expect(countByteSequence(bytes, [0x99, 36])).toBe(2);
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

  it('accepts dotted notation durations and exports MusicXML dot markings', () => {
    const project = OG.ogCreateProject({ ppq: 960 });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    const written = OG.ogWriteNotationInput(project, pattern.id, synth.id, 'C4:q. D4:e. R:s E4:dotted-quarter', {
      replace: true
    });
    expect(written.noteCount).toBe(3);
    expect(written.warnings).toEqual([]);

    const notes = pattern.events.filter((event) => event.type === 'note' && event.trackId === synth.id);
    expect(notes.map((event) => event.startTick)).toEqual([0, 1440, 2400]);
    expect(notes.map((event) => event.durationTicks)).toEqual([1440, 720, 1440]);

    const xml = OG.ogBuildMusicXmlSketch(project, pattern.id, synth.id);
    expect(xml).toContain('<duration>1440</duration>\n        <type>quarter</type>\n        <dot/>');
    expect(xml).toContain('<duration>720</duration>\n        <type>eighth</type>\n        <dot/>');
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

    OG.ogApplySynthPatchPreset(project, synth.id, 'roundSub');
    OG.ogSetStaffNote(project, pattern.id, synth.id, {
      startBar: 0,
      startBeat: 2,
      pitch: 'G2',
      duration: 'q',
      replaceSlot: true
    });
    expect(OG.ogInferStaffClef(project, synth.id, { clef: 'auto' })).toBe('bass');
    expect(OG.ogNormalizeStaffClef('bass')).toBe('bass');
    const bassStaff = OG.ogBuildStaffEngraving(project, pattern.id, { trackId: synth.id, clef: 'auto' });
    expect(bassStaff).toMatchObject({ clef: 'bass', clefLabel: 'Bass' });
    const bassNote = bassStaff.measures[0].notes.find(item => item.pitch === 'G2');
    expect(bassNote.y).toBeCloseTo(bassStaff.geometry.bottomY, 5);
    expect(bassNote.ledgerLines).toHaveLength(0);

    const forcedTreble = OG.ogBuildStaffEngraving(project, pattern.id, { trackId: synth.id, clef: 'treble' });
    expect(forcedTreble).toMatchObject({ clef: 'treble', clefLabel: 'Treble' });
    const forcedTrebleNote = forcedTreble.measures[0].notes.find(item => item.pitch === 'G2');
    expect(forcedTrebleNote.ledgerLines.length).toBeGreaterThan(bassNote.ledgerLines.length);
  });

  it('bridges notation notes to grid steps, scale names, chords, and performance offsets', () => {
    const project = OG.ogCreateProject({ tonic: 'C', mode: 'minor' });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];
    OG.ogAppendEvent(project, pattern.id, {
      type: 'chord',
      trackId: synth.id,
      root: 'C',
      quality: 'minor',
      startTick: 0,
      durationTicks: OG.ogTicksPerMeasure(project)
    });
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 2, 16, { on: true });
    OG.ogAppendEvent(project, pattern.id, {
      type: 'note',
      trackId: synth.id,
      pitch: 'Eb4',
      startTick: 500,
      durationTicks: 480,
      notationStartTick: 480,
      notationDurationTicks: 480,
      velocity: 0.7
    });

    const bridge = OG.ogBuildNotationGridBridge(project, pattern.id, {
      trackId: synth.id,
      stepsPerBar: 16,
      selectedBar: 0
    });
    expect(bridge).toMatchObject({ keyName: 'C Minor', stepsPerBar: 16, performedOffsetCount: 1, offGridCount: 0 });
    expect(bridge.notes[0]).toMatchObject({
      pitch: 'Eb4',
      bar: 1,
      startBeat: 1.5,
      step: 3,
      localStep: 2,
      durationSteps: 2,
      timingOffsetTicks: 20,
      gridOffsetTicks: 0,
      solfege: 'Mi',
      nashville: '3',
      chordRoman: 'i'
    });
    expect(bridge.measures[0].steps[2]).toMatchObject({ noteCount: 1, drumCount: 1 });
    expect(bridge.measures[0].steps[2].notes[0]).toMatchObject({ pitch: 'Eb4', solfege: 'Mi' });
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('writes scale-aware melody phrases as notation-safe events', () => {
    const project = OG.ogCreateProject({ title: 'Melody Lesson', tonic: 'C', mode: 'minor' });
    const pattern = project.patterns[0];
    const synth = project.tracks[1];
    OG.ogApplySynthPatchPreset(project, synth.id, 'brightLead');
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
    expect(phrase.rangeFitCount).toBe(0);
    expect(phrase.instrumentRange).toMatchObject({ presetId: 'brightLead', rangeLabel: 'C3-C6' });
    expect(OG.ogBuildNotationPreview(project, pattern.id).notes.some(note => note.role === 'melody')).toBe(true);

    const bassProject = OG.ogCreateProject({ title: 'Bass Melody Lesson', tonic: 'C', mode: 'minor' });
    const bassPattern = bassProject.patterns[0];
    const bassSynth = bassProject.tracks[1];
    OG.ogApplySynthPatchPreset(bassProject, bassSynth.id, 'roundSub');
    const bassPhrase = OG.ogWriteMelodyPhrase(bassProject, bassPattern.id, bassSynth.id, {
      style: 'ascending',
      startBar: 0,
      bars: 1,
      seed: 'bass-range-phrase',
      octave: 4
    });
    expect(bassPhrase.instrumentRange).toMatchObject({ presetId: 'roundSub', rangeLabel: 'C1-C3' });
    expect(bassPhrase.rangeFitCount).toBeGreaterThan(0);
    expect(bassPhrase.events.every(event => event.midi >= 24 && event.midi <= 48)).toBe(true);
    expect(bassPhrase.events.every(event => event.pitch === event.notation.spelling)).toBe(true);
    expect(OG.ogBuildInstrumentRangeReport(bassProject, bassPattern.id, bassSynth.id)).toMatchObject({ outOfRangeCount: 0 });

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

  it('builds pattern launcher summaries for pattern and song workflow', () => {
    const project = OG.ogCreateProject({ tonic: 'C', mode: 'minor' });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    const synth = project.tracks[1];

    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true });
    OG.ogAppendEvent(project, pattern.id, {
      type: 'chord',
      trackId: synth.id,
      root: 'C',
      quality: 'minor',
      startTick: 0,
      durationTicks: OG.ogTicksPerMeasure(project)
    });
    OG.ogSetNoteStep(project, pattern.id, synth.id, 'C4', 0, 16, { on: true });
    OG.ogSetAutomationPoint(project, pattern.id, synth.id, 'effect.delay.mix', 4, 16, 0.5);
    const variation = OG.ogDuplicatePattern(project, pattern.id, 'Variation');
    const scene = OG.ogAddScene(project, { name: 'Variation Scene', patternIds: [variation.id] });
    OG.ogAddArrangementSection(project, scene.id, { startBar: 5, bars: 4 });

    const launcher = OG.ogBuildPatternLauncher(project, { activePatternId: variation.id });
    expect(launcher).toMatchObject({
      patternCount: 2,
      sceneCount: 2,
      sectionCount: 2,
      activePatternId: variation.id
    });
    expect(launcher.patterns[0]).toMatchObject({
      slot: 'A',
      active: false,
      drumHitCount: 1,
      noteCount: 1,
      chordCount: 1,
      automationCount: 1,
      sceneCount: 1,
      sectionCount: 1
    });
    expect(launcher.patterns[0].firstChord).toMatchObject({ roman: 'i', symbol: 'Cm' });
    expect(launcher.patterns[1]).toMatchObject({
      slot: 'B',
      active: true,
      drumHitCount: 1,
      noteCount: 1,
      chordCount: 1,
      sceneCount: 1,
      sectionCount: 1
    });
    expect(OG.ogValidateProject(project)).toEqual([]);
  });

  it('applies named song forms with reusable pattern variants', () => {
    const project = OG.ogCreateProject();
    const pattern = project.patterns[0];
    const forms = OG.ogListSongFormPresets();
    expect(forms.map(form => form.id)).toContain('verse-hook');

    const summary = OG.ogApplySongFormPreset(project, 'verse-hook', {
      patternId: pattern.id,
      replace: true
    });
    expect(summary).toMatchObject({
      presetId: 'verse-hook',
      sectionCount: 6,
      totalBars: 40,
      sourcePatternId: pattern.id
    });
    expect(summary.createdPatternIds).toHaveLength(1);
    expect(project.patterns).toHaveLength(2);

    const timeline = OG.ogBuildArrangementTimeline(project);
    expect(timeline.map(section => section.label)).toEqual(['Intro', 'Verse', 'Hook', 'Verse 2', 'Hook 2', 'Outro']);
    expect(timeline[1]).toMatchObject({ role: 'A', variant: 'A', startBar: 5, bars: 8, endBar: 12 });
    expect(timeline[2]).toMatchObject({ role: 'B', variant: 'B', startBar: 13, bars: 8, endBar: 20 });
    expect(timeline[2].patternIds).toEqual([summary.createdPatternIds[0]]);
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

  it('installs original procedural factory kits without attribution risk', () => {
    const project = OG.ogCreateProject();
    const drums = project.tracks[0];
    const kits = OG.ogListFactorySampleKits();
    expect(kits.map(kit => kit.id)).toEqual(expect.arrayContaining([
      'openGrooveProceduralKit',
      'openGrooveElectronicKit',
      'openGrooveClassroomPercussionKit'
    ]));
    expect(kits.every(kit => kit.license === 'Original' && kit.creator === 'Open Groove' && kit.pads.length === 16)).toBe(true);

    const installed = OG.ogInstallFactorySampleKit(project, drums.id, 'openGrooveProceduralKit', { createdAt: 456 });
    expect(installed).toMatchObject({
      kitId: 'openGrooveProceduralKit',
      license: 'Original',
      assignedCount: 16,
      createdCount: 16,
      reusedCount: 0
    });
    expect(project.assets).toHaveLength(16);
    expect(project.assets.every(asset => asset.license === 'Original' && asset.mimeType === 'audio/procedural')).toBe(true);
    expect(project.assets.every(asset => asset.tags.includes('factory') && asset.tags.includes('procedural'))).toBe(true);
    expect(project.assets[0].proceduralVoice).toMatchObject({ character: 'studio', kitId: 'openGrooveProceduralKit' });
    expect(drums.pads.find(pad => pad.id === 'pad_1')).toMatchObject({ proceduralVoice: { character: 'studio', kitId: 'openGrooveProceduralKit', body: 1 } });
    expect(drums.pads.find(pad => pad.id === 'pad_14')).toMatchObject({ engine: 'chord', name: 'Minor Chord Hit' });
    expect(OG.ogBuildProjectStorageReport(project)).toMatchObject({
      assetCount: 16,
      sessionCount: 16,
      factoryCount: 16,
      proceduralCount: 16
    });
    expect(OG.ogBuildLicenseReport(project)).toMatchObject({ assetCount: 16, exportSafe: true });
    expect(OG.ogBuildAttributionText(project)).toBe('No attribution-required assets.');

    const reinstalled = OG.ogInstallFactorySampleKit(project, drums.id, 'openGrooveProceduralKit');
    expect(reinstalled).toMatchObject({ assignedCount: 16, createdCount: 0, reusedCount: 16 });
    expect(project.assets).toHaveLength(16);

    const electronic = OG.ogInstallFactorySampleKit(project, drums.id, 'openGrooveElectronicKit');
    expect(electronic).toMatchObject({ assignedCount: 16, createdCount: 16, reusedCount: 0 });
    expect(project.assets).toHaveLength(32);
    expect(drums.pads.find(pad => pad.id === 'pad_1')).toMatchObject({ engine: 'kick', name: 'Punch Kick', proceduralVoice: { character: 'electronic', kitId: 'openGrooveElectronicKit', brightness: 1.22 } });
    expect(OG.ogBuildProjectStorageReport(project)).toMatchObject({ assetCount: 32, factoryCount: 32, proceduralCount: 32 });
    expect(OG.ogBuildLicenseReport(project)).toMatchObject({ assetCount: 32, exportSafe: true });

    const shaped = OG.ogSetPadProceduralVoice(project, drums.id, 'pad_1', { pitch: 9, brightness: 0.1, noise: 1.5 });
    expect(shaped).toMatchObject({ character: 'electronic', kitId: 'openGrooveElectronicKit', pitch: 2, brightness: 0.35, noise: 1.5 });
    const shapedPad = drums.pads.find(pad => pad.id === 'pad_1');
    const shapedAsset = OG.ogFindAsset(project, shapedPad.assetId);
    expect(shapedAsset.proceduralVoice).toMatchObject({ pitch: 2, brightness: 0.35, noise: 1.5 });
    OG.ogSetDrumStep(project, project.patterns[0].id, drums.id, 'pad_1', 0, 16, { on: true });
    expect(OS.ogBuildPlaybackPlan(project, { patternId: project.patterns[0].id })[0]).toMatchObject({ padEngine: 'kick', drumVoice: { pitch: 2, brightness: 0.35, noise: 1.5 } });

    const resetVoice = OG.ogResetPadProceduralVoice(project, drums.id, 'pad_1');
    expect(resetVoice).toMatchObject({ character: 'electronic', kitId: 'openGrooveElectronicKit', pitch: 1.08, brightness: 1.22, noise: 0.86 });
    expect(shapedPad.proceduralVoiceDefault).toMatchObject({ character: 'electronic', pitch: 1.08, brightness: 1.22 });
    expect(shapedAsset.proceduralVoiceDefault).toMatchObject({ character: 'electronic', pitch: 1.08, brightness: 1.22 });
    const voicePresets = OG.ogListProceduralVoicePresets();
    expect(voicePresets.map(preset => preset.id)).toEqual(expect.arrayContaining(['tight', 'deep', 'bright', 'warm', 'airy']));
    voicePresets[0].voice.pitch = 9;
    expect(OG.ogGetProceduralVoicePreset(voicePresets[0].id).voice.pitch).not.toBe(9);
    const deepVoice = OG.ogApplyPadProceduralVoicePreset(project, drums.id, 'pad_1', 'deep');
    expect(deepVoice).toMatchObject({ character: 'electronic', kitId: 'openGrooveElectronicKit', pitch: 0.82, brightness: 0.78, body: 1.32 });
    expect(shapedAsset.proceduralVoice).toMatchObject({ pitch: 0.82, brightness: 0.78, body: 1.32 });
    expect(OG.ogDescribeProceduralVoice(deepVoice)).toMatchObject({ summary: 'Low / Warm / Medium / Clean / Defined / Full' });
    expect(OG.ogDescribePadProceduralVoice(project, drums.id, 'pad_1').fields.map(field => field.label)).toEqual(['Register', 'Timbre', 'Envelope', 'Texture', 'Transient', 'Body']);
    const voiceCompare = OG.ogComparePadProceduralVoice(project, drums.id, 'pad_1');
    expect(voiceCompare).toMatchObject({ changedCount: 6, summary: 'Pitch -0.26, Bright -0.44, Decay +0.34, +3 more' });
    expect(voiceCompare.changed.find(change => change.id === 'click')).toMatchObject({ delta: -0.63, direction: 'lower' });
    expect(OG.ogResetPadProceduralVoice(project, drums.id, 'pad_1')).toMatchObject({ pitch: 1.08, brightness: 1.22, noise: 0.86 });
    expect(OG.ogComparePadProceduralVoice(project, drums.id, 'pad_1')).toMatchObject({ changedCount: 0, summary: 'Matches factory voice' });
    const randomizedA = OG.ogRandomizePadProceduralVoice(project, drums.id, 'pad_1', { seed: 'voice-1', amount: 0.42 });
    expect(randomizedA.pitch).toBeGreaterThanOrEqual(0.5);
    expect(randomizedA.pitch).toBeLessThanOrEqual(2);
    OG.ogResetPadProceduralVoice(project, drums.id, 'pad_1');
    const randomizedB = OG.ogRandomizePadProceduralVoice(project, drums.id, 'pad_1', { seed: 'voice-1', amount: 0.42 });
    expect(randomizedB).toEqual(randomizedA);
    expect(OG.ogResetPadProceduralVoice(project, drums.id, 'pad_1')).toMatchObject({ pitch: 1.08, brightness: 1.22, noise: 0.86 });

    const classroomProject = OG.ogCreateProject();
    const classroom = OG.ogInstallFactorySampleKit(classroomProject, classroomProject.tracks[0].id, 'openGrooveClassroomPercussionKit');
    expect(classroom).toMatchObject({ assignedCount: 16, createdCount: 16 });
    expect(classroomProject.tracks[0].pads.find(pad => pad.id === 'pad_1')).toMatchObject({ name: 'Desk Boom', proceduralVoice: { character: 'classroom', kitId: 'openGrooveClassroomPercussionKit', noise: 1.18 } });
    OG.ogSetDrumStep(classroomProject, classroomProject.patterns[0].id, classroomProject.tracks[0].id, 'pad_1', 0, 16, { on: true });
    expect(OS.ogBuildPlaybackPlan(classroomProject, { patternId: classroomProject.patterns[0].id })[0]).toMatchObject({ padEngine: 'kick', drumVoice: { character: 'classroom', kitId: 'openGrooveClassroomPercussionKit', noise: 1.18 } });
    expect(OG.ogBuildLicenseReport(classroomProject)).toMatchObject({ assetCount: 16, exportSafe: true });
    expect(OG.ogValidateProject(project)).toEqual([]);
    expect(OG.ogValidateProject(classroomProject)).toEqual([]);
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

  it('repeats pattern material across longer arrangement sections', () => {
    const project = OG.ogCreateProject({ bpm: 120 });
    const pattern = project.patterns[0];
    const drums = project.tracks[0];
    OG.ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', 0, 16, { on: true });
    project.arrangement = [];
    OG.ogAddArrangementSection(project, project.scenes[0].id, { startBar: 1, bars: 8, label: 'Repeat' });

    const hits = OS.ogBuildArrangementPlaybackPlan(project).filter(item => item.type === 'drumHit');
    expect(hits).toHaveLength(2);
    expect(hits.map(hit => hit.patternRepeatIndex)).toEqual([0, 1]);
    expect(hits[1]).toMatchObject({
      sectionOffsetTick: OG.ogTicksPerMeasure(project) * 4,
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
