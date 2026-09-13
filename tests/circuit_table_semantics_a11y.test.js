import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_circuit.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Circuit Lab table semantics', () => {
  it('gives every data table a concise accessible caption', () => {
    const tables = [];
    const isElement = (node, tag) => node?.type === 'CallExpression' && node.callee.name === 'h' && node.arguments[0]?.value === tag;
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (isElement(node, 'table')) tables.push(node);
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    visit(parse(source, { ecmaVersion: 'latest' }));
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      const captions = table.arguments.slice(2).filter(child => isElement(child, 'caption'));
      expect(captions, 'Each data table needs one direct caption').toHaveLength(1);
      expect(captions[0].arguments.slice(2).some(child => child.type !== 'Literal' || String(child.value || '').trim().length > 0)).toBe(true);
    }
    for (const caption of [
      'Series and parallel circuit comparison',
      'Resistor color code reference',
      'Operational amplifier configurations',
      'Electrical units and constants',
      'Schematic symbols comparison',
      'Common electrical connectors and cables',
      'Household appliance power reference',
      'American Wire Gauge reference',
      'Battery technology comparison',
      'Digital communication protocols',
      'Electronic sensor reference',
      'Electronic actuator reference',
    ]) {
      expect(source).toContain(`h('caption', { className: 'sr-only' }, '${caption}')`);
    }
  });

  it('associates every generated column header with its column', () => {
    const columnScopes = source.match(/key: 'h'\+i, scope: 'col'/g)?.length ?? 0;
    expect(columnScopes).toBe(12);
  });

  it('uses a scoped row header for the identifying cell in every row', () => {
    const rowScopes = source.match(/h\('th', \{ scope: 'row'/g)?.length ?? 0;
    expect(rowScopes).toBe(12);
    for (const value of [
      'r.aspect',
      'c.color',
      'o.name',
      'u.quantity',
      's.name',
      'c.name',
      'a.device',
      'w.awg',
      'b.type',
      'p.protocol',
      's.sensor',
      'a.actuator',
    ]) {
      expect(source).toMatch(new RegExp(`h\\('th', \\{ scope: 'row'[^\\n]+\\}, ${value.replace('.', '\\.') }\\)`));
    }
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
