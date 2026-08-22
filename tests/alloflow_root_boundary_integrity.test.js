import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';

const shellFiles = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
  'desktop/web-app/src/AlloFlowANTI.txt',
];

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const occurrences = (source, value) => source.split(value).length - 1;

describe('AlloFlow root bootstrap boundary integrity', () => {
  it.each(shellFiles)('%s keeps the LAN, mailbox, and workspace-recovery scopes intact', (file) => {
    const shell = read(file);

    expect(() => parse(shell, { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
    expect(shell).not.toMatch(/\/\/ \$ fit/);

    const lanAt = shell.indexOf("const ALLO_LAN_CONFIG_KEY = 'alloflow_live_session_config';");
    const mailboxAt = shell.indexOf('const ALLO_MB_SCRIPT_VERSION = 18;');
    const recoveryAt = shell.indexOf('const ALLO_WORKSPACE_RECOVERY = (() => {');
    const normalizeAt = shell.indexOf('const normalizeStore = (candidate, options = {}) => {', recoveryAt);
    const contiguousAt = shell.indexOf('set stays contiguous ("the 6 most recent")', normalizeAt);
    const measureAt = shell.indexOf('const measureBytes = (snapshot) => {', contiguousAt);

    expect(lanAt, file).toBeGreaterThan(0);
    expect(mailboxAt, file).toBeGreaterThan(lanAt);
    expect(recoveryAt, file).toBeGreaterThan(mailboxAt);
    expect(normalizeAt, file).toBeGreaterThan(recoveryAt);
    expect(contiguousAt, file).toBeGreaterThan(normalizeAt);
    expect(measureAt, file).toBeGreaterThan(contiguousAt);

    expect(occurrences(shell, 'const ALLO_MB_SCRIPT_VERSION = 18;'), file).toBe(1);
    expect(occurrences(shell, 'const ALLO_WORKSPACE_RECOVERY = (() => {'), file).toBe(1);
    expect(occurrences(shell, 'const normalizeStore = (candidate, options = {}) => {'), file).toBe(1);
  });
});
