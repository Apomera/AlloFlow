/**
 * Temporary probe: dumps every rendered accessible name and text run for a set
 * of tools so a keying pass can be proved to change no rendered output.
 * Driven by RENDER_IDENTITY_TOOLS + RENDER_IDENTITY_OUT; inert without them.
 * Deleted once the pass it supports has been committed.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOLS = (process.env.RENDER_IDENTITY_TOOLS || '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = process.env.RENDER_IDENTITY_OUT || '';
const SENTINEL = String.fromCharCode(1);

describe('render identity probe', () => {
  it('dumps rendered names and text for the requested tools', () => {
    if (!TOOLS.length || !OUT) { expect(true).toBe(true); return; }
    mkdirSync(OUT, { recursive: true });
    TOOLS.forEach((tool) => {
      let payload;
      try {
        const file = 'stem_lab/stem_tool_' + tool + '.js';
        resetStemLab();
        let id = tool;
        let data;
        try {
          data = loadTool(file, id);
        } catch (first) {
          const avail = String(first.message).split('Available: ')[1] || '';
          id = avail.split(', ').map((s) => s.trim()).filter(Boolean).pop();
          data = loadTool(file, id);
        }
        const markup = renderTool(id, data, {});
        payload = {
          names: [...markup.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]),
          text: markup.replace(/<[^>]*>/g, SENTINEL).split(SENTINEL).map((s) => s.trim()).filter(Boolean),
          bytes: markup.length,
        };
      } catch (err) {
        payload = { error: String(err && err.message) };
      }
      writeFileSync(OUT + '/' + tool + '.json', JSON.stringify(payload, null, 1));
    });
    expect(TOOLS.length).toBeGreaterThan(0);
  });
});
