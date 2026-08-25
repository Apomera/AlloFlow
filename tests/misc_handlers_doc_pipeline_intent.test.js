import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const built = readFileSync('misc_handlers_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/misc_handlers_module.js', 'utf8');

function loadIntentClassifier() {
  const browser = { AlloModules: {} };
  new Function('window', built)(browser);
  return browser.AlloModules.MiscHandlers.docPipelineIntentForUpload;
}

const intentFor = loadIntentClassifier();

describe('MiscHandlers document-pipeline upload intent', () => {
  it.each([
    { file: { name: 'grades.xlsx', type: '', size: 10 }, expected: 'await' },
    { file: { name: 'notes.md', type: '', size: 10 }, expected: 'prewarm' },
    { file: { name: 'lesson.pdf', type: 'application/pdf', size: 10 }, expected: 'prewarm' },
    { file: { name: 'lesson.docx', type: '', size: 10 }, expected: 'prewarm' },
    { file: { name: 'lesson.pptx', type: '', size: 10 }, expected: 'prewarm' },
    { file: { name: 'scan.PNG', type: 'application/octet-stream', size: 10 }, expected: 'prewarm' },
    { file: { name: 'photo.jpeg', type: '', size: 10 }, expected: 'prewarm' },
    { file: { name: 'diagram.webp', type: '', size: 10 }, expected: 'prewarm' },
    { file: { name: 'lecture.mp3', type: '', size: 10 }, expected: 'prewarm' },
    { file: { name: 'demo.mp4', type: '', size: 10 }, expected: 'prewarm' },
    { file: { name: 'notes.txt', type: 'text/plain', size: 10 }, expected: 'none' },
    { file: { name: 'animation.gif', type: 'image/gif', size: 10 }, expected: 'none' },
    { file: { name: 'scan.tiff', type: 'image/tiff', size: 10 }, expected: 'none' },
    { file: { name: 'unknown.bin', type: 'application/octet-stream', size: 10 }, expected: 'none' },
  ])('$file.name -> $expected', ({ file, expected }) => {
    expect(intentFor(file)).toBe(expected);
  });

  it('ships the helper in both byte-identical module copies', () => {
    expect(typeof intentFor).toBe('function');
    expect(deployed).toBe(built);
  });
});
