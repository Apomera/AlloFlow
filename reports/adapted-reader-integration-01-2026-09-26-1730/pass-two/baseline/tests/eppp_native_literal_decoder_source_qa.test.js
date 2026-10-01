import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = fs.readFileSync(resolve(root, 'dev-tools/eppp_native_learning_payloads.cjs'), 'utf8');

describe('EPPP legacy glossary literal decoder reliability', () => {
  it('reuses one isolated VM context and keeps dynamic code generation disabled', () => {
    expect(source).toContain("const legacyStringLiteralContext = vm.createContext(Object.create(null)");
    expect(source).toContain("codeGeneration: { strings: false, wasm: false }");
    expect(source).toContain('.runInContext(legacyStringLiteralContext, { timeout: 1000 })');
    expect(source).not.toContain('vm.runInNewContext(`${quote}${body}${quote}`, Object.create(null), { timeout: 100 })');
  });
});
