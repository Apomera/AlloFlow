import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let AudioHelpers;

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('audio_helpers_module.js');
  AudioHelpers = window.AlloModules.AudioHelpers;
});

describe('downloadable audio citation safety', () => {
  it('removes inline citation labels, balanced destinations, and the reference trailer', () => {
    const citation = '[\u207d\u00b9\u207e](https://example.test/path_(v2))';
    const input = [
      '# Topic',
      `A supported fact ${citation}.`,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      `The translated fact ${citation}.`,
      '',
      '### Source Text References',
      '',
      '*These sources were surfaced by AI-assisted search and have not been independently verified.*',
      '',
      '1. [Study](https://example.test/path_(v2))',
      '',
      '*Partial-grounding notice: one section has no claim-linked citations.*',
    ].join('\n');

    const clean = AudioHelpers.prepareDownloadAudioText(input);
    expect(clean).toContain('Topic');
    expect(clean).toContain('A supported fact.');
    expect(clean).toContain('The translated fact.');
    expect(clean).toContain('ENGLISH TRANSLATION');
    expect(clean).not.toContain('\u207d\u00b9\u207e');
    expect(clean).not.toContain('Source Text References');
    expect(clean).not.toContain('AI-assisted search');
    expect(clean).not.toContain('Partial-grounding notice');
    expect(clean).not.toContain('example.test');
  });

  it('preserves ordinary link labels and migrates legacy references-before-English layout', () => {
    const citation = '[\u207d\u00b2\u207e](https://source.test/item_(2))';
    const input = `Hola ${citation}. [Learn more](https://school.test/wiki/Topic_(class)).\n\n### References\n\n2. [Source](https://source.test/item_(2))\n\n--- ENGLISH TRANSLATION ---\n\nHello ${citation}.`;
    const clean = AudioHelpers.prepareDownloadAudioText(input);
    expect(clean).toContain('Hola. Learn more.');
    expect(clean).toContain('Hello.');
    expect(clean).not.toContain('### References');
    expect(clean).not.toContain('source.test');
    expect(clean).not.toContain('school.test');
  });
});
