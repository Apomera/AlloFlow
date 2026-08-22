import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const shellFiles = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
  'desktop/web-app/src/AlloFlowANTI.txt',
];

let Fluency;

beforeAll(() => {
  loadAlloModule('fluency_module.js');
  Fluency = window.AlloModules.Fluency;
});

describe('fluency CSV CDN extraction', () => {
  it('exports only fluency assessments and preserves the legacy CSV contract', () => {
    let blobParts;
    let blobOptions;
    const BlobCtor = class {
      constructor(parts, options) {
        blobParts = parts;
        blobOptions = options;
      }
    };
    const click = vi.fn();
    const link = { click };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const documentRef = {
      createElement: vi.fn(() => link),
      body: { appendChild, removeChild },
    };
    const urlApi = {
      createObjectURL: vi.fn(() => 'blob:fluency-csv'),
      revokeObjectURL: vi.fn(),
    };
    const formatDate = vi.fn(() => '8/20/2026');

    const exported = Fluency.exportFluencyCSV([
      { type: 'quiz', data: { metrics: { wcpm: 999 } } },
      {
        type: 'fluency-record',
        timestamp: 1787184000000,
        data: {
          sourceText: 'A "quoted",\npassage',
          metrics: { wcpm: 42, accuracy: 66, totalWords: 3, durationSeconds: 61.7 },
          wordData: [
            { word: 'A', status: 'correct' },
            { word: 'quoted', status: 'mispronounced' },
            { word: 'passage', status: 'missed' },
          ],
          fullAnalysis: { insertions: ['extra'] },
          review: { status: 'reviewed', reviewer: 'Dr. "Reader"', reviewedAt: '2026-08-20' },
          passageMetadata: { passageId: 'parallel,1', calibrated: true },
        },
      },
    ], {
      BlobCtor,
      documentRef,
      urlApi,
      formatDate,
      now: new Date('2026-08-21T12:00:00.000Z'),
    });

    expect(exported).toBe(true);
    expect(formatDate).toHaveBeenCalledOnce();
    expect(blobOptions).toEqual({ type: 'text/csv;charset=utf-8;' });
    expect(blobParts).toHaveLength(1);
    const csv = blobParts[0];
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain('Date,Passage,WCPM,Accuracy %');
    expect(csv).toContain('8/20/2026,"A ""quoted""  passage",42,66,3,62');
    expect(csv).toContain(',1,1,1,0,1:1.0,frustrational,reviewed,"Dr. ""Reader""",2026-08-20,"parallel,1",yes');
    expect(csv).not.toContain('999');
    expect(link.href).toBe('blob:fluency-csv');
    expect(link.download).toBe('Fluency_Assessments_2026-08-21.csv');
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledWith(link);
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:fluency-csv');
  });

  it('preserves the empty-history warning hook without touching browser APIs', () => {
    const onEmpty = vi.fn();
    const documentRef = { createElement: vi.fn(), body: {} };

    expect(Fluency.exportFluencyCSV([], { onEmpty, documentRef })).toBe(false);
    expect(Fluency.exportFluencyCSV([{ type: 'fluency-record', data: {} }], { onEmpty, documentRef })).toBe(false);
    expect(onEmpty).toHaveBeenCalledTimes(2);
    expect(documentRef.createElement).not.toHaveBeenCalled();
  });

  it('keeps only a module bridge in every generated shell', () => {
    for (const file of shellFiles) {
      const shell = read(file);
      const start = shell.indexOf('const exportFluencyCSV = () => {');
      const end = shell.indexOf('const generateFluencyScoreSheet', start);
      expect(start, file).toBeGreaterThanOrEqual(0);
      expect(end, file).toBeGreaterThan(start);
      const bridge = shell.slice(start, end);
      expect(bridge, file).toContain('window.AlloModules && window.AlloModules.Fluency');
      expect(bridge, file).toContain('fluency.exportFluencyCSV(history, {');
      expect(bridge, file).toContain('onEmpty');
      expect(bridge, file).not.toContain('Fluency_Assessments_');
      expect(bridge, file).not.toContain('new Blob');
      expect(bridge, file).not.toContain('createObjectURL');
      expect(shell.match(/loadModule\('Fluency'/g), file).toHaveLength(1);
    }
  });

  it('ships the existing CDN artifact and public mirror byte-for-byte', () => {
    const built = read('fluency_module.js');
    const publicMirror = read('desktop/web-app/public/fluency_module.js');
    expect(built).toContain('function exportFluencyCSV(records, options)');
    expect(built).toContain('exportFluencyCSV: exportFluencyCSV');
    expect(publicMirror).toBe(built);
  });
});
