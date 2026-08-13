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
});
