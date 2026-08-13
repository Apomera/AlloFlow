import fs from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

function loadHandlers() {
  const source = fs.readFileSync('export_handlers_module.js', 'utf8');
  const context = {
    window: { AlloModules: {} },
    document,
    navigator: {},
    console: { log() {}, warn() {}, error() {} },
    Blob, URL,
  };
  vm.runInNewContext(source, context);
  return context.window.AlloModules.ExportHandlers;
}

describe('Read This Page semantic equivalence', () => {
  let handlers;
  beforeEach(() => { handlers = loadHandlers(); });

  it('does not silently truncate structured source paragraphs', () => {
    const text = Array.from({ length: 12 }, (_, index) => `Paragraph ${index + 1} has complete learner content.`).join('\n\n');
    const items = handlers.getReadableContent({ activeView: 'input', inputText: text });
    expect(items.filter((item) => item.type === 'text')).toHaveLength(12);
    expect(items.some((item) => /more paragraphs/i.test(item.text))).toBe(false);
  });

  it('names visible controls, values, states, errors, and meaningful images without exposing secrets', () => {
    document.body.innerHTML = `<main id="fixture">
      <h2>Practice reflection</h2>
      <p>Explain your reasoning.</p>
      <img alt="A labeled water-cycle diagram" src="x.png">
      <label for="answer">Reflection answer</label>
      <textarea id="answer" aria-describedby="answer-help">Evaporation begins the cycle.</textarea>
      <span id="answer-help">Use one complete sentence.</span>
      <button aria-pressed="true">Record response</button>
      <input aria-label="Class password" type="password" value="do-not-speak">
      <button hidden>Hidden action</button>
      <div role="alert">Answer is required.</div>
    </main>`;
    const root = document.getElementById('fixture');
    const speech = handlers.getReadableContent({ activeView: 'custom-tool', root }).map((item) => item.text).join(' | ');
    expect(speech).toContain('Image: A labeled water-cycle diagram');
    expect(speech).toMatch(/Reflection answer.*current value Evaporation begins the cycle/);
    expect(speech).toContain('Use one complete sentence.');
    expect(speech).toMatch(/button: Record response.*pressed/);
    expect(speech).toContain('Answer is required.');
    expect(speech).not.toContain('do-not-speak');
    expect(speech).not.toContain('Hidden action');
  });


  it('narrates DOM and structured media descriptions once and identifies missing descriptions', () => {
    document.body.innerHTML = '<main id="fixture">' +
      '<figure><svg role="img" aria-label="A flow chart linking evaporation to condensation"></svg>' +
      '<figcaption>Water cycle stages</figcaption></figure>' +
      '<video aria-describedby="video-desc"><track kind="captions" label="English">' +
      '<track kind="descriptions" label="Audio description"></video>' +
      '<span id="video-desc">A beaker warms while vapor rises.</span>' +
      '<img alt="" src="decorative.png"><img src="missing.png"></main>';
    const generatedContent = {
      type: 'image',
      data: {
        imageUrl: 'generated.png',
        altText: 'A plant leaf receives sunlight, water, and carbon dioxide.',
      },
    };
    const root = document.getElementById('fixture');
    const items = handlers.getReadableContent({ activeView: 'custom-tool', root, generatedContent });
    const speech = items.map((item) => item.text).join(' | ');

    expect(speech).toContain('Image: A flow chart linking evaporation to condensation');
    expect(speech).toContain('Video: A beaker warms while vapor rises. Available tracks: captions English, descriptions Audio description');
    expect(speech).toContain('Image: A plant leaf receives sunlight, water, and carbon dioxide.');
    expect(speech).toContain('Image: no text description is available.');
    expect(speech).not.toContain('decorative.png');
    expect(items.filter((item) => item.text === 'Image: A plant leaf receives sunlight, water, and carbon dioxide.')).toHaveLength(1);

    const captionsOnlyRoot = document.createElement('main');
    captionsOnlyRoot.innerHTML = '<video><track kind="captions" label="English"></video>';
    const captionsOnly = handlers.getMediaDescriptionItems({ root: captionsOnlyRoot });
    expect(captionsOnly).toHaveLength(1);
    expect(captionsOnly[0]).toMatchObject({ mediaKind: 'video', described: false });
    expect(captionsOnly[0].text).toBe('Video: no text description is available. Available tracks: captions English');
  });

  it('keeps pure media snapshots bounded and does not expose source URLs', () => {
    const descriptions = handlers.getMediaDescriptionItems({
      generatedContent: {
        type: 'gallery',
        data: Array.from({ length: 400 }, (_, index) => ({
          imageUrl: 'https://private.example/student-' + index + '.png',
          altText: 'Diagram ' + index,
        })),
      },
      root: document.createElement('main'),
    });

    expect(descriptions.length).toBeLessThanOrEqual(80);
    expect(descriptions[0]).toMatchObject({ type: 'image', mediaKind: 'image', described: true });
    expect(descriptions.map((item) => item.text).join(' ')).not.toContain('private.example');
  });


  it('upserts by media source, preserves distinct assets with identical alt text, and carries language', () => {
    document.body.innerHTML = '<main id="fixture" lang="es">' +
      '<img src="shared.png" alt="Descripci?n visual del ciclo del agua.">' +
      '<img src="first.png" alt="Diagrama repetido.">' +
      '<img src="second.png" alt="Diagrama repetido."></main>';
    const root = document.getElementById('fixture');
    const media = handlers.getMediaDescriptionItems({
      root,
      generatedContent: {
        data: [
          { image: 'shared.png' },
          { visualDescriptions: [{ description: 'Una mol?cula de agua se evapora.', language: 'es' }] },
        ],
      },
    });

    expect(media.filter((item) => item.text.includes('Descripci?n visual del ciclo del agua'))).toHaveLength(1);
    expect(media.filter((item) => item.text === 'Image: Diagrama repetido.')).toHaveLength(2);
    expect(media.some((item) => item.mediaKind === 'video' && item.text.includes('Una mol?cula de agua se evapora.'))).toBe(true);
    expect(media.filter((item) => item.text.includes('Descripci?n visual'))[0].language).toBe('es');
    expect(media.some((item) => item.text === 'Image: no text description is available.' && item.mediaKind === 'image')).toBe(false);
  });

  it('keeps the desktop runtime copy byte-identical', () => {
    expect(fs.readFileSync('desktop/web-app/public/export_handlers_module.js', 'utf8'))
      .toBe(fs.readFileSync('export_handlers_module.js', 'utf8'));
  });
});
