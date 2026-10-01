import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOST_PATHS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function readHost(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8').replace(/\r\n/g, '\n');
}

function configRecordsBlock(source) {
  const start = source.indexOf('configRecords: isTeacherMode');
  expect(start, 'Lingua configRecords prop is missing').toBeGreaterThan(-1);
  const end = source.indexOf('submissionRecords: isTeacherMode', start);
  expect(end, 'Lingua submissionRecords prop must follow configRecords').toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Lingua teacher revision-history host wiring', () => {
  it.each(HOST_PATHS)('%s passes a bounded teacher-only config ledger', (relativePath) => {
    const source = readHost(relativePath);
    const block = configRecordsBlock(source);

    expect(source.indexOf("initialConfig: generatedContent?.type === 'lingua-config'")).toBeLessThan(
      source.indexOf('configRecords: isTeacherMode'),
    );
    expect(block).toContain('? (Array.isArray(history) ? history : [])');
    expect(block).toContain("item.type === 'lingua-config'");
    expect(block).toContain("item.data && typeof item.data === 'object' && !Array.isArray(item.data)");
    expect(block).toContain('.slice(-200)');
    expect(block).toContain("historyId: String(item.id || '').slice(0, 180)");
    expect(block).toContain('item.timestamp instanceof Date && Number.isFinite(item.timestamp.getTime())');
    expect(block).toContain('? item.timestamp.toISOString()');
    expect(block).toContain("String(item.timestamp || '').slice(0, 80)");
    expect(block).toContain('data: item.data');
    expect(block.trimEnd()).toMatch(/:\s*\[\],$/);
  });

  it('keeps the Lingua config ledger contract identical in all host mirrors', () => {
    const blocks = HOST_PATHS.map((relativePath) => configRecordsBlock(readHost(relativePath)));
    expect(blocks[1]).toBe(blocks[0]);
    expect(blocks[2]).toBe(blocks[0]);
  });
});
