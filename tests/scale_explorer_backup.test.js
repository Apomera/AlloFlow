import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_EXPLORER_BACKUP_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  '  window.backup = { save: notebookBackup, read: readNotebookBackup, snapshot: savedNotebook, plan: notebookImportPlan, signature: notebookSignature, model: drawingModel, measurement: inquiryMeasurement, evidence: inquiryEvidence, items: ITEMS };\n  window.StemLab.registerTool(\'scaleExplorer\', {'), sandbox);
const api = sandbox.window.backup;
const person = { id: 'human', size: 1.23, you: true }, earth = { id: 'earth' };
const inquiry = (id = 'inquiry-backup-1') => ({ id, theme: 'home', small: person, big: earth, guess: '6.5', revealed: true,
  question: 'How can my height anchor a drawing of Earth?', reflection: 'The length ratio does not establish a volume ratio.',
  comparison: { small: person, big: earth }, drawing: { reference: earth, target: person, extras: [{ id: 'moon' }], size: '16', unit: 'cm', note: '<b>Keep my recorded height.</b>' } });
const notebook = () => ({ observations: [{ itemId: 'human', you: true, size: 1.23, note: 'My recorded height.', yaw: .3, pitch: .2 },
  { itemId: 'earth', detailId: 'sahara', sunAngle: 135, note: 'Look for contrasting terrain.' }], investigations: [inquiry()],
  scalingRecord: { factor: '2', reflection: 'Every edge doubled; each face has four times the area.' }, drawingRecord: inquiry().drawing });
const encoded = data => JSON.stringify({ format: 'alloflow.scale-explorer.notebook', version: 1, notebook: data });

describe('Scale Explorer portable saved notebook', () => {
  it('backs up saved evidence only and preserves exact captured heights, questions and drawings', () => {
    const raw = { ...notebook(), yourHeightCm: 220, inquiryDraft: { question: 'Unsaved question' }, drawingDraft: { note: 'Unsaved drawing' }, unrelated: 'Keep elsewhere' };
    const text = api.save(raw), parsed = JSON.parse(text), restored = api.read(text);
    expect(parsed.format).toBe('alloflow.scale-explorer.notebook'); expect(parsed.version).toBe(1);
    expect(Object.keys(parsed.notebook).sort()).toEqual(['drawingRecord', 'investigations', 'observations', 'scalingRecord']);
    expect(text).not.toContain('Unsaved'); expect(text).not.toContain('Keep elsewhere');
    expect(restored.error).toBeUndefined(); expect(restored.recovered).toBe(false);
    expect(restored.notebook.investigations[0].small).toEqual(person); expect(restored.notebook.drawingRecord.target).toEqual(person);
    expect(restored.notebook.investigations[0].question).toBe(raw.investigations[0].question);
    expect(api.evidence(restored.notebook.investigations[0])).toEqual([true, true, true, true]);
    expect(restored.notebook).toEqual(api.snapshot(raw));
  });

  it('round-trips lighting, cutaways, terrain flight poses and camera views without introducing duplicates', () => {
    const raw = { observations: [{ itemId: 'everest', detailId: 'everest-flight', terrainPoint: { east: 450, north: -150 },
      terrainFlight: { east: 600, north: -300, altitude: 9000, heading: 123, pitch: .17 }, terrainFlightSpeed: 240, terrainRelief: 4, zoom: 3 },
      { itemId: 'orion-nebula', detailId: 'trapezium', nebulaReveal: true, yaw: -1.37, pitch: .3333333333333 },
      { itemId: 'ecoli', detailId: 'nucleoid', cutaway: false, zoom: 2 }], investigations: [] };
    const initial = api.snapshot(raw), restored = api.read(api.save(initial));
    expect(restored.error).toBeUndefined(); expect(restored.recovered).toBe(false);
    expect(restored.notebook.observations).toHaveLength(3);
    expect(restored.notebook.observations[0]).toMatchObject({ terrainFlightSpeed: 240, terrainRelief: 4 });
    expect(restored.notebook.observations[0].terrainFlight).toEqual(initial.observations[0].terrainFlight);
    expect(restored.notebook.observations[1].nebulaReveal).toBe(true); expect(restored.notebook.observations[2].cutaway).toBe(false);
    expect(api.plan(initial, restored.notebook).rows.map(row => row.status)).toEqual(['duplicate', 'duplicate', 'duplicate']);
  });

  it('rejects malformed files, foreign formats and unsupported versions without attempting restoration', () => {
    for (const text of ['', '{', 'null', '[]', '{}']) expect(api.read(text).error).toBeTruthy();
    for (const version of [2, '1', null]) expect(api.read(JSON.stringify({ format: 'alloflow.scale-explorer.notebook', version, notebook: notebook() })).error).toBe('version');
    expect(api.read(JSON.stringify({ format: 'other-tool', version: 1, notebook: notebook() })).error).toBe('format');
    expect(api.read(4).error).toBe('invalid');
  });

  it('bounds file size, collection shape and per-file notebook capacity', () => {
    expect(api.read(' '.repeat(512 * 1024 + 1)).error).toBe('size');
    for (const data of [[], null, {}, { observations: {}, investigations: [] }, { observations: [], investigations: 'bad' }]) expect(api.read(encoded(data)).error).toBe('invalid');
    expect(api.read(encoded({ observations: Array(25).fill({ itemId: 'earth' }), investigations: [] })).error).toBe('limits');
    expect(api.read(encoded({ observations: [], investigations: Array(13).fill(inquiry()) })).error).toBe('limits');
    expect(api.read(encoded({ observations: [], investigations: [] })).error).toBe('empty');
    const nested = '{"format":"alloflow.scale-explorer.notebook","version":1,"notebook":{"observations":[{"itemId":"earth"}],"investigations":[],"extra":' + '['.repeat(12000) + '0' + ']'.repeat(12000) + '}}';
    expect(api.read(nested).error).toBe('invalid');
  });

  it('recovers known records while rebuilding catalog references and discarding hostile extra properties', () => {
    const data = JSON.parse('{"observations":[{"itemId":"__proto__","note":"Bad target"},{"itemId":"earth","size":1,"note":"<script>literal</script>","source":"javascript:bad()","__proto__":{"polluted":true}}],"investigations":[]}');
    const result = api.read(encoded(data));
    expect(result.recovered).toBe(true); expect(result.notebook.observations).toHaveLength(1);
    expect(result.notebook.observations[0].size).toBe(12742000); expect(result.notebook.observations[0].note).toBe('<script>literal</script>');
    expect(result.notebook.observations[0].source).toBeUndefined(); expect({}.polluted).toBeUndefined();
    expect(api.read(encoded({ observations: [{ itemId: 'missing' }], investigations: [] })).error).toBe('empty');
  });

  it('does not claim comparison or drawing evidence from inconsistent captured measurements', () => {
    const record = inquiry(); record.comparison.small = { id: 'human', size: 2.2, you: true };
    record.drawing.target = { id: 'human', size: 2.2, you: true };
    const result = api.read(encoded({ observations: [], investigations: [record] }));
    expect(result.recovered).toBe(true); expect(result.notebook.investigations[0].small).toEqual(person);
    expect(api.evidence(result.notebook.investigations[0])).toEqual([true, false, false, true]);
  });

  it('keeps legacy saved investigations usable without inventing new evidence', () => {
    const record = inquiry(); delete record.question; delete record.comparison; delete record.drawing;
    const result = api.read(encoded({ observations: [], investigations: [record] }));
    expect(result.recovered).toBe(true); expect(result.notebook.investigations[0].question).toBe('');
    expect(api.evidence(result.notebook.investigations[0])).toEqual([true, false, false, true]);
    expect(api.plan({}, result.notebook).imported).toBe(1);
  });

  it('bounds recovered prose and preserves literal text', () => {
    const data = notebook(); data.investigations[0].question = 'q'.repeat(700); data.investigations[0].reflection = '<img>'.repeat(500);
    data.observations[0].note = 'n'.repeat(2000); data.drawingRecord.note = 'd'.repeat(2000);
    const result = api.read(encoded(data));
    expect(result.recovered).toBe(true); expect(result.notebook.investigations[0].question).toHaveLength(400);
    expect(result.notebook.investigations[0].reflection).toHaveLength(1200); expect(result.notebook.observations[0].note).toHaveLength(1200);
    expect(result.notebook.drawingRecord.note).toHaveLength(1200);
  });

  it('adds new records while keeping existing saved work by default', () => {
    const current = { observations: [{ itemId: 'moon', note: 'My current note.' }], investigations: [] }, incoming = notebook();
    const before = JSON.stringify(current), result = api.plan(current, incoming);
    expect(result.imported).toBe(5); expect(result.blocked).toBe(0);
    expect(result.notebook.observations[0].note).toBe('My current note.'); expect(result.notebook.observations).toHaveLength(3);
    expect(result.notebook.investigations[0].small).toEqual(person); expect(JSON.stringify(current)).toBe(before);
  });

  it('requires selection before replacing a changed observation, model or standalone drawing', () => {
    const current = notebook(), incoming = notebook();
    incoming.observations[0].note = 'Imported note.'; incoming.scalingRecord.reflection = 'Imported model.'; incoming.drawingRecord.note = 'Imported drawing.';
    const preview = api.plan(current, incoming);
    expect(preview.rows.filter(row => row.status === 'replace').map(row => row.selected)).toEqual([false, false, false]);
    expect(preview.imported).toBe(0); expect(preview.notebook).toEqual(api.snapshot(current));
    const restored = api.plan(current, incoming, { 'observation:0': true, 'scalingRecord:0': true, 'drawingRecord:0': true });
    expect(restored.imported).toBe(3); expect(restored.notebook.observations[0].note).toBe('Imported note.');
    expect(restored.notebook.scalingRecord.reflection).toBe('Imported model.'); expect(restored.notebook.drawingRecord.note).toBe('Imported drawing.');
    expect(current.observations[0].note).toBe('My recorded height.');
  });

  it('imports a changed investigation as an independent copy with a valid collision-free ID', () => {
    const old = inquiry(), incoming = inquiry(); old.question = 'Earlier explanation.';
    const reserved = { ...inquiry('inquiry-import-1'), question: 'A separate investigation.' };
    const current = { investigations: [old, reserved] }, data = { investigations: [incoming] };
    expect(api.plan(current, data).rows[0]).toMatchObject({ status: 'copy', selected: false });
    const result = api.plan(current, data, { 'investigation:0': true });
    expect(result.imported).toBe(1); expect(result.notebook.investigations.map(record => record.id)).toEqual(['inquiry-backup-1', 'inquiry-import-1', 'inquiry-import-2']);
    expect(result.notebook.investigations[2].drawing.target).toEqual(person);
    expect(result.notebook.investigations[0].question).toBe('Earlier explanation.');
    expect(api.read(api.save(result.notebook)).notebook.investigations).toHaveLength(3);
    expect(api.plan(result.notebook, data).rows[0].status).toBe('duplicate');
  });

  it('recognizes identical investigations across IDs and suppresses duplicates in one incoming backup', () => {
    const first = inquiry(), copy = { ...inquiry('inquiry-another-2') };
    const duplicate = api.plan({ investigations: [first] }, { investigations: [copy] }, { 'investigation:0': true });
    expect(duplicate.imported).toBe(0); expect(duplicate.rows[0]).toMatchObject({ status: 'duplicate', selected: false });
    const incoming = api.plan({}, { investigations: [first, copy] });
    expect(incoming.imported).toBe(1); expect(incoming.notebook.investigations).toHaveLength(1);
    expect(incoming.rows[1]).toMatchObject({ status: 'duplicate', selected: false });
  });

  it('permits choosing which new records fit the remaining slots and reports over-capacity selections', () => {
    const notes = api.items.slice(0, 23).map(item => ({ itemId: item.id, note: item.name }));
    const remaining = api.items.slice(23, 25).map(item => ({ itemId: item.id, note: item.name }));
    const current = { observations: notes }, incoming = { observations: remaining };
    const preview = api.plan(current, incoming); expect(preview.imported).toBe(1); expect(preview.rows.map(row => row.selected)).toEqual([true, false]);
    const chosen = api.plan(current, incoming, { 'observation:0': false, 'observation:1': true });
    expect(chosen.notebook.observations[23].itemId).toBe(remaining[1].itemId); expect(chosen.blocked).toBe(0);
    const blocked = api.plan(current, incoming, { 'observation:0': true, 'observation:1': true });
    expect(blocked.blocked).toBe(1); expect(blocked.rows[1].status).toBe('full'); expect(current.observations).toHaveLength(23);
  });

  it('allows explicit observation replacement at capacity while preventing added investigation copies', () => {
    const notes = api.items.slice(0, 24).map(item => ({ itemId: item.id, note: 'Old note.' }));
    const inquiries = Array.from({ length: 12 }, (_, index) => ({ ...inquiry('inquiry-full-' + index), question: 'Question ' + index }));
    const changed = { ...inquiry('inquiry-full-0'), question: 'Recovered question.' };
    const current = { observations: notes, investigations: inquiries };
    const incoming = { observations: [{ itemId: notes[0].itemId, note: 'Restored note.' }], investigations: [changed] };
    const result = api.plan(current, incoming, { 'observation:0': true });
    expect(result.imported).toBe(1); expect(result.notebook.observations).toHaveLength(24); expect(result.notebook.observations[0].note).toBe('Restored note.');
    const blocked = api.plan(current, incoming, { 'investigation:0': true }); expect(blocked.blocked).toBe(1);
    expect(blocked.notebook.investigations).toHaveLength(12); expect(blocked.notebook.investigations[0].question).toBe('Question 0');
  });

  it('gives restored evidence independent nested objects and leaves import selections as plain data', () => {
    const raw = notebook(), before = JSON.stringify(raw), choices = Object.freeze({ 'investigation:0': true });
    const result = api.plan({}, raw, choices);
    result.notebook.investigations[0].drawing.target.size = 2.2; result.notebook.drawingRecord.extras[0].size = 1;
    expect(JSON.stringify(raw)).toBe(before); expect(choices).toEqual({ 'investigation:0': true });
  });

  it('preserves an eight-measurement linked drawing at one exact physical scale', () => {
    const record = inquiry(); record.drawing = { reference: { id: 'milkyway' }, target: person, extras: ['earth', 'moon', 'jupiter', 'sun', 'dna', 'rbc'].map(id => ({ id })), size: '16', unit: 'cm', note: 'One scale for all eight.' };
    const restored = api.read(api.save({ investigations: [record] })).notebook.investigations[0];
    expect(restored.drawing.extras).toHaveLength(6); expect(api.evidence(restored)).toEqual([true, true, true, true]);
    const drawing = api.model(api.measurement(restored.drawing.reference), api.measurement(restored.drawing.target), restored.drawing.size, restored.drawing.unit);
    expect(drawing.targetMM).toBe(160 * (1.23 / 9.5e20)); expect(restored.drawing.note).toBe('One scale for all eight.');
  });

  it('keeps undo fingerprints stable across camera normalization but distinguishes later saved edits', () => {
    const initial = api.snapshot(notebook()), roundTrip = api.read(api.save(initial)).notebook;
    expect(api.signature(roundTrip)).toBe(api.signature(initial));
    roundTrip.investigations[0].reflection = 'A later saved explanation.';
    expect(api.signature(roundTrip)).not.toBe(api.signature(initial));
  });

  it('keeps backup labels and desktop source synchronized without rewording existing strings', () => {
    const labels = Object.fromEntries([...source.matchAll(/S\('(atlas_backup_[a-z_]+)', ('(?:\\.|[^'\\])*')/g)].map(match => [match[1], vm.runInNewContext(match[2])]));
    expect(Object.keys(labels)).toHaveLength(36);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/web-app/build/ui_strings.js', 'desktop/app-build/ui_strings.js'].filter(file => fs.existsSync(file))) {
      const strings = JSON.parse(fs.readFileSync(file, 'utf8')).stem.scaleExplorer;
      for (const [key, label] of Object.entries(labels)) expect(strings[key], file + ' ' + key).toBe(label);
    }
    if (!process.env.SCALE_EXPLORER_BACKUP_SOURCE) expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js', 'utf8')).toBe(source);
  });
});
