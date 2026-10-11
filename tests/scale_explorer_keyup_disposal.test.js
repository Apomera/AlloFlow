import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const paths = ['stem_lab/stem_tool_scaleexplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'];
describe('Scale Explorer queued key releases', () => {
  it.each(paths)('ignores queued key releases after disposal or disconnection in %s', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const declaration = source.split('\n').find((line) => line.includes('function airKeyUp(ev)'));
    expect(declaration).toBeTruthy();
    for (const [disposed, isConnected, active] of [[true, true, false], [false, false, false], [false, true, true]]) {
      const keys = { KeyW: true }, invalidate = [];
      const handler = Function('disposed', 'canvas', 'airKeys', 'invalidate', `${declaration}; return airKeyUp;`)(
        disposed, { isConnected }, keys, () => invalidate.push(true));
      handler({ code: 'KeyW' });
      expect(keys.KeyW).toBe(active ? undefined : true);
      expect(invalidate.length).toBe(active ? 1 : 0);
    }
  });
  it('keeps the canonical and served handler identical', () => {
    const handlers = paths.map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8').split('\n')
      .find((line) => line.includes('function airKeyUp(ev)')).trim());
    expect(handlers[1]).toBe(handlers[0]);
  });
});
