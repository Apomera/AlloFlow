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

describe('fluency score-sheet CDN extraction', () => {
  it('prints the reviewed running record through the Fluency API and escapes document values', () => {
    let html = '';
    const close = vi.fn();
    const openWindow = vi.fn(() => ({
      document: {
        write: (value) => { html = value; },
        close,
      },
    }));

    const opened = Fluency.generateFluencyScoreSheet({
      wcpm: 42,
      accuracy: 50,
      insertions: ['private insertion'],
      wordData: [
        { word: '<script>alert(1)</script>', status: 'correct', said: '<b>spoken</b>' },
        { word: 'Second', status: 'missed' },
      ],
    }, '<img src=x onerror=alert(2)>', {
      t: (key) => key === 'print.oral_fluency_title' ? '<b>Fluency record</b>' : key,
      studentNickname: '<img src=x onerror=alert(3)>',
      fluencyBenchmarkGrade: '3<script>',
      fluencyBenchmarkSeason: 'Fall & Winter',
      displayDate: '8/21/2026',
      openWindow,
    });

    expect(opened).toBe(true);
    expect(openWindow).toHaveBeenCalledWith('', '_blank');
    expect(close).toHaveBeenCalledOnce();
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;spoken&lt;/b&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(3)&gt;');
    expect(html).toContain('Fall &amp; Winter');
    expect(html).toContain('&lt;b&gt;Fluency record&lt;/b&gt;');
    expect(html).toContain('🖨️ Print Score Sheet');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('onerror=alert(2)');
    expect(html).not.toContain('private insertion');
  });

  it('fails closed without reviewed word data', () => {
    const openWindow = vi.fn();
    expect(Fluency.generateFluencyScoreSheet(null, '', { openWindow })).toBe(false);
    expect(Fluency.generateFluencyScoreSheet({}, '', { openWindow })).toBe(false);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('keeps only an injected host bridge in every generated shell', () => {
    for (const file of shellFiles) {
      const shell = read(file);
      const start = shell.indexOf('const generateFluencyScoreSheet = (result, sourceText) => {');
      const end = shell.indexOf('const saveFluencyReview', start);
      expect(start, file).toBeGreaterThanOrEqual(0);
      expect(end, file).toBeGreaterThan(start);
      const bridge = shell.slice(start, end);
      expect(bridge, file).toContain('window.AlloModules && window.AlloModules.Fluency');
      expect(bridge, file).toContain('fluency.generateFluencyScoreSheet(result, sourceText, {');
      expect(bridge, file).toContain('studentNickname');
      expect(bridge, file).toContain('fluencyBenchmarkGrade');
      expect(bridge, file).toContain('fluencyBenchmarkSeason');
      expect(bridge, file).not.toContain('wordMarkup');
      expect(bridge, file).not.toContain('window.open');
      expect(bridge, file).not.toContain('fonts.googleapis.com');
      expect(shell.match(/loadModule\('Fluency'/g), file).toHaveLength(1);
    }
  });

  it('ships the existing CDN artifact and public mirror byte-for-byte', () => {
    const built = read('fluency_module.js');
    const publicMirror = read('desktop/web-app/public/fluency_module.js');
    expect(built).toContain('function generateFluencyScoreSheet(result, sourceText, options)');
    expect(built).toContain('generateFluencyScoreSheet: generateFluencyScoreSheet');
    expect(publicMirror).toBe(built);
  });
});
