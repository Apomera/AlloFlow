import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const source = readFileSync('teacher_source.jsx', 'utf8');
const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });
let declaration;
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'VariableDeclarator' && node.id.name === 'ProfileField') declaration = node;
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(ast);
if (!declaration) throw new Error('Roster ProfileField was not found');
const compiled = transformSync('const ' + source.slice(declaration.start, declaration.end) + ';', {
  plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
}).code;

function field(props) {
  const update = vi.fn();
  const ProfileField = new Function('React', 'handleUpdateGroupProfile', compiled + '\nreturn ProfileField;')(React, update);
  const element = ProfileField({ type: 'select', label: 'Profile choice', field: 'gradeLevel', gId: 'group-one', ...props });
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(element);
  return { select: host.querySelector('select'), element: element.props.children.find(child => child?.type === 'select'), update };
}

describe('quick-group values remain visible in the complete roster editor', () => {
  it.each(['College', 'Graduate Level', 'Ukrainian'])('retains the saved %s choice outside the older option list', value => {
    const { select, update } = field({ value, options: ['Kindergarten', '5th Grade'] });
    expect(select.value).toBe(value);
    expect([...select.options].map(option => option.value)).toEqual(['', 'Kindergarten', '5th Grade', value]);
    expect(update).not.toHaveBeenCalled();
  });

  it('does not duplicate existing string or object choices', () => {
    const { select } = field({ value: 'blue', options: ['default', { id: 'blue', label: 'Blue theme' }] });
    expect(select.value).toBe('blue');
    expect([...select.options].map(option => option.value)).toEqual(['', 'default', 'blue']);
    expect(select.options[2].textContent).toBe('Blue theme');
  });

  it('keeps the empty option and explicit profile editing behavior', () => {
    const { select, element, update } = field({ value: '', options: ['English', 'French'], field: 'leveledTextLanguage' });
    expect(select.value).toBe('');
    expect(select.options.length).toBe(3);
    element.props.onChange({ target: { value: 'French' } });
    expect(update).toHaveBeenCalledWith('group-one', 'leveledTextLanguage', 'French');
  });
});
