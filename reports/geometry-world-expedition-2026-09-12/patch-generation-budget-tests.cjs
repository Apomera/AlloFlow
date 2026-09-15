'use strict';
const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(__dirname, '../../tests/geometry_world_block_fidelity.test.js');
const input = fs.readFileSync(target, 'utf8'), newline = input.includes('\r\n') ? '\r\n' : '\n';
let source = input.replace(/\r\n/g, '\n');
const first = source.indexOf("  it('drops a structure that alone exceeds the block limit'");
const last = source.indexOf("  it('leaves a normal lesson completely intact'", first);
if (first < 0 || last < 0) throw new Error('Expected old authored budget tests.');
source = source.slice(0, first) + String.raw`  it('rejects an oversized authored structure without dropping a referenced teaching target', () => {
    const v = loadValidateLesson();
    const lesson = {
      title: 'Huge',
      ground: { xMin: -4, xMax: 24, zMin: -4, zMax: 24, y: 0, type: 'grass' },
      structures: [fill(-4, 1, -4, 24, 20, 24)],
      npcs: [{ name: 'A', position: [1, 1, 1], dialogue: 'hi' }],
    };
    expect(() => v.validateLesson(lesson)).toThrow(/limit is 900/);
    expect(lesson.structures).toHaveLength(1);
    expect(v.toasts.some((t) => /Dropped/.test(t.message))).toBe(false);
  });

  it('rejects aggregate authored overflow and keeps ground outside the construction budget', () => {
    const v = loadValidateLesson();
    const many = [];
    for (let i = 0; i < 10; i += 1) many.push(fill(i, 1, 0, i + 9, 10, 9));
    const lesson = {
      title: 'Many',
      ground: { xMin: -48, xMax: 48, zMin: -48, zMax: 48, y: 0, type: 'grass' },
      structures: many,
      npcs: [{ name: 'A', position: [1, 1, 1], dialogue: 'hi' }],
    };
    expect(() => v.validateLesson(lesson)).toThrow(/limit is 900/);
    expect(lesson.structures).toHaveLength(10);
    lesson.structures = [fill(0, 1, 0, 9, 8, 9),
      { ...fill(-48, 0, -1, 48, 0, 1), measurementLayer: 'ground' }];
    expect(v.validateLesson(lesson).structures).toHaveLength(2);
  });

` + source.slice(last);
const next = source.replace(/\n/g, newline);
const fd = fs.openSync(target, 'r+');
try { fs.writeFileSync(fd, next, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(next)); }
finally { fs.closeSync(fd); }
console.log('Updated authored-budget tests without changing remaining block-fidelity coverage.');
