import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import parser from '@babel/parser';

const source = fs.readFileSync('teacher_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('teacher_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/teacher_module.js', 'utf8');
const teacherAst = parser.parse(source, {
  sourceType: 'script',
  plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'],
});
const teacherButtons = [];
const visit = (node) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier' && node.name.name === 'button') {
    teacherButtons.push(node);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
};
visit(teacherAst);

describe('Teacher interface control semantics', () => {
  it('uses an explicit valid type for every native button', () => {
    expect(teacherButtons.length).toBeGreaterThan(0);
    const typeAttributes = teacherButtons.map((button) =>
      button.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'type')
    );
    expect(typeAttributes.flatMap((attribute, index) => attribute ? [] : [teacherButtons[index].loc.start.line])).toEqual([]);
    const typeValues = typeAttributes.map((attribute) => attribute.value?.value);
    expect(typeValues.filter((value) => value !== 'button' && value !== 'submit')).toEqual([]);
    expect(typeValues.filter((value) => value === 'submit')).toHaveLength(1);
  });

  it('exposes the donut visualization as a named progress value', () => {
    expect(source).toContain('role="progressbar" aria-label={label}');
    expect(source).toContain('aria-valuemin={0} aria-valuemax={100}');
    expect(source).toContain('aria-valuenow={Math.round(safePercent)}');
  });

  it('names data charts and scopes every table column header', () => {
    expect(source).toContain('<svg role="img" aria-label={data.map');
    expect(source).toContain('<svg role="img" aria-label={(t(');
    expect(source).toContain('<svg aria-hidden="true" focusable="false"');
    expect(source.match(/<th scope="col"/g)).toHaveLength(16);
  });
});

describe('Teacher and Escape Room motion and focus', () => {
  it('provides a local fallback for every animation and transition utility', () => {
    const lines = source.split(/\r?\n/);
    const animated = lines.filter((line) => /animate-(?:spin|pulse|bounce|ping)/.test(line));
    const transitioning = lines.filter((line) => /transition-(?:all|colors|opacity|shadow|transform)/.test(line));
    expect(animated.length).toBeGreaterThan(0);
    expect(transitioning.length).toBeGreaterThan(0);
    expect(animated.filter((line) => !line.includes('motion-reduce:animate-none'))).toEqual([]);
    expect(transitioning.filter((line) => !line.includes('motion-reduce:transition-none'))).toEqual([]);
  });

  it('suppresses custom confetti when reduced motion is requested', () => {
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('.confetti-particle { animation: none !important; display: none !important; }');
    expect(source).toContain('motion-reduce:hidden');
  });

  it('keeps visible focus on programmatically focused Escape Room states', () => {
    expect(source.match(/focus:ring-4 focus:ring-inset focus:ring-white/g)).toHaveLength(5);
    expect(source).toContain("if (event.key === 'Tab')");
    expect(source).toContain('pauseDialogRef.current?.focus();');
  });

  it('keeps generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(moduleSource).toContain('aria-valuenow');
    expect(publicModule).toBe(moduleSource);
  });
});
