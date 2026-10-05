import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(process.env.SCALE_EXPLORER_REPORT_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  '  window.report = { rows: notebookReportRows, select: notebookReportSelection, html: notebookReportHtml, snapshot: savedNotebook, signature: notebookSignature, items: ITEMS };\n  window.StemLab.registerTool(\'scaleExplorer\', {'), sandbox);
const api = sandbox.window.report, person = { id: 'human', size: 1.23, you: true }, earth = { id: 'earth' };
const inquiry = (id = 'inquiry-report-1') => ({ id, theme: 'home', small: person, big: earth, guess: '6.5', revealed: true, question: 'How can my height anchor a drawing?',
  reflection: 'Different objects do not have the same shape.', comparison: { small: person, big: earth },
  drawing: { reference: earth, target: person, extras: [{ id: 'moon' }], size: '16', unit: 'cm', note: 'My linked plan.' } });
const saved = () => ({ observations: [{ itemId: 'human', size: 1.23, you: true, note: 'My recorded height.' }, { itemId: 'earth', detailId: 'sahara', note: 'Saved terrain.' }],
  investigations: [inquiry()], scalingRecord: { factor: '2', reflection: 'Volume grew by eight.' }, drawingRecord: inquiry().drawing });
const labels = { lang: 'en', defaultTitle: 'Scale Explorer field notebook', appTitle: 'Scale Explorer · learning report', summary: 'Selected saved records: 1', scope: 'Measured lengths; illustrative models.',
  print: 'Use the calibrated SVG for physical measurements.', kinds: { observation: 'Observation', investigation: 'Investigation', scalingRecord: 'Model', drawingRecord: 'Drawing' } };

describe('Scale Explorer readable learning reports', () => {
  it('uses stable saved identities and captured heights while excluding drafts and unrelated data', () => {
    const raw = { ...saved(), yourHeightCm: 220, inquiryDraft: { question: 'Unsaved question' }, observationDrafts: { 'human:': 'Unsaved note' }, other: 'Elsewhere' }, rows = api.rows(raw);
    expect(rows.map(row => row.key)).toEqual(['observation:human:', 'observation:earth:sahara', 'investigation:inquiry-report-1', 'scalingRecord:0', 'drawingRecord:0']);
    expect(rows[0].record.size).toBe(1.23); expect(rows[2].record.small).toEqual(person);
    expect(JSON.stringify(rows)).not.toContain('Unsaved'); expect(JSON.stringify(rows)).not.toContain('Elsewhere');
    expect(api.rows({ ...raw, observations: [...raw.observations].reverse() })[0].key).toBe(rows[1].key);
  });
  it('keeps a selected investigation linked to its own comparison and drawing', () => {
    const selected = api.select(saved(), { 'observation:earth:sahara': true, 'investigation:inquiry-report-1': true, 'drawingRecord:0': false });
    expect(selected.observations.map(row => row.itemId)).toEqual(['earth']); expect(selected.investigations).toHaveLength(1);
    expect(selected.investigations[0].drawing.target).toEqual(person); expect(selected.investigations[0].comparison.small).toEqual(person);
    expect(selected.drawingRecord).toBeNull(); expect(selected.scalingRecord).toBeNull();
  });
  it('requires explicit boolean selections and ignores inherited or foreign identities', () => {
    const choices = Object.assign(Object.create({ 'observation:human:': true }), { 'drawingRecord:0': 'true', 'scalingRecord:0': 1, 'investigation:missing': true });
    expect(api.select(saved(), choices)).toEqual({ observations: [], investigations: [], scalingRecord: null, drawingRecord: null });
    expect(api.select(saved(), null).investigations).toHaveLength(0); expect(api.select(null, { 'observation:human:': true }).observations).toHaveLength(0);
  });
  it('gives report snapshots independent nested evidence', () => {
    const raw = saved(), before = JSON.stringify(raw), snapshot = api.snapshot(raw), selected = api.select(snapshot, { 'investigation:inquiry-report-1': true, 'drawingRecord:0': true });
    selected.investigations[0].drawing.target.size = 2.2; selected.drawingRecord.extras[0].id = 'sun';
    expect(JSON.stringify(raw)).toBe(before); expect(snapshot.investigations[0].drawing.target.size).toBe(1.23); expect(snapshot.drawingRecord.extras[0].id).toBe('moon');
  });
  it('bounds reports to valid notebook records and reconstructs trusted dimensions', () => {
    const notes = api.items.slice(0, 30).map(item => ({ itemId: item.id, size: 77, note: 'Saved.' }));
    const investigations = Array.from({ length: 16 }, (_, index) => inquiry('inquiry-full-' + index));
    const rows = api.rows({ observations: notes, investigations, scalingRecord: saved().scalingRecord, drawingRecord: saved().drawingRecord });
    expect(rows).toHaveLength(38); expect(rows[0].record.size).toBe(api.items[0].size);
    expect(api.rows({ observations: [{ itemId: 'foreign' }], investigations: [{ ...inquiry(), small: { id: 'foreign' } }], drawingRecord: {} })).toEqual([]);
  });
  it('renders hostile HTML, attributes and control characters as literal text', () => {
    const payload = '</p><script>window.attack=1</script><img src=x onerror="attack=2">& text\nSecond line.';
    const html = api.html('<b>My title</b>', [{ kind: 'observation', title: payload, lines: [payload, 'javascript:attack()', 'data:text/html,<script>attack()</script>', '\u0000literal'] }], { ...labels, lang: 'en" onload="attack()' });
    expect(html).toContain('&lt;b&gt;My title&lt;/b&gt;'); expect(html).toContain('&lt;script&gt;window.attack=1&lt;/script&gt;');
    expect(html).not.toMatch(/<(?:script|img)\b/); expect(html).not.toContain('href="javascript:'); expect(html).not.toContain('href="data:'); expect(html).not.toContain('\u0000');
    expect(html).toContain('lang="en&quot; onload=&quot;attack()"'); expect(html).toContain('default-src &#39;none&#39;');
  });
  it('links complete web URLs safely while retaining literal prose and parameters', () => {
    const html = api.html('Sources', [{ kind: 'observation', title: 'Earth', lines: ['https://science.nasa.gov/earth/?a=1&b=2', 'See https://example.test in this note.', 'file:///tmp/private', 'https://example.test/<script>'] }], labels);
    expect(html.match(/<a href=/g)).toHaveLength(1); expect(html).toContain('href="https://science.nasa.gov/earth/?a=1&amp;b=2" rel="noopener noreferrer"');
    expect(html).toContain('See https://example.test in this note.'); expect(html).not.toContain('href="file:');
  });
  it('provides readable print semantics, a bounded fallback title and no external dependencies', () => {
    const sections = [{ kind: 'investigation', title: 'Two dimensions', lines: ['Prediction: 6.5 powers of ten.', 'Measured lengths: 1.23 m and 12742000 m.'] }], html = api.html(' '.repeat(170), sections, labels);
    expect(html).toContain('<title>Scale Explorer field notebook</title>'); expect(html).toContain('<h1>Scale Explorer field notebook</h1>');
    expect(html).toContain('<main>'); expect(html).toContain('data-record-kind="investigation"'); expect(html).toContain('@page{size:A4;margin:15mm}');
    expect(html).not.toMatch(/<(?:script|link|iframe|img|form|button)\b/); expect(html).not.toMatch(/https?:\/\//);
    expect(api.html('A'.repeat(200), sections, labels)).toContain('<h1>' + 'A'.repeat(160) + '</h1>');
  });
  it('distinguishes later saved edits from unsaved drafts and camera normalization', () => {
    const raw = saved(), snapshot = api.snapshot(raw);
    expect(api.signature(snapshot)).toBe(api.signature(api.snapshot(snapshot)));
    expect(api.signature(api.snapshot({ ...raw, observationDrafts: { 'human:': 'Later draft' } }))).toBe(api.signature(snapshot));
    raw.observations[0].note = 'Later saved observation.'; expect(api.signature(api.snapshot(raw))).not.toBe(api.signature(snapshot));
  });
  it('keeps report labels and desktop source synchronized', () => {
    const added = Object.fromEntries([...source.matchAll(/S\('(atlas_report_[a-z_]+)', ('(?:\\.|[^'\\])*')/g)].map(match => [match[1], vm.runInNewContext(match[2])]));
    expect(Object.keys(added)).toHaveLength(24);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/web-app/build/ui_strings.js', 'desktop/app-build/ui_strings.js'].filter(file => fs.existsSync(file))) {
      const strings = JSON.parse(fs.readFileSync(file, 'utf8')).stem.scaleExplorer;
      for (const [key, value] of Object.entries(added)) expect(strings[key], file + ' ' + key).toBe(value);
    }
    if (!process.env.SCALE_EXPLORER_REPORT_SOURCE) expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js', 'utf8')).toBe(source);
  });
});
