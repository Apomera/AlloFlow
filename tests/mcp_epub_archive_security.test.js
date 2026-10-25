import { it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const A = require('../desktop/mcp/remediation_epub_archive.cjs');
const E = require('../desktop/mcp/remediation_epub_validation.cjs');
const { makeZip, zipFileMap } = require('../desktop/mcp/zip_writer.cjs');
let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-epub-security-')); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
const entry = (name, data = 'small fixture') => ({ name, data });
function save(bytes) { const file = path.join(dir, 'test.epub'); fs.writeFileSync(file, bytes); return file; }
function central(bytes) { return bytes.readUInt32LE(bytes.length - 6); }
const rejected = file => expect(A.inspect(file)).rejects.toMatchObject({ code: 'ALLOFLOW_EPUB_ARCHIVE_UNSAFE' });

it('round trips generated EPUB file maps, empty files, Unicode names and stored/deflated bytes', async () => {
  const files = { mimetype: 'application/epub+zip', 'META-INF/container.xml': '<container/>', 'OEBPS/café.xhtml': '<html>lesson</html>', 'OEBPS/empty.txt': '' };
  const file = save(zipFileMap(files, 'mimetype'));
  expect(await A.inspect(file)).toMatchObject({ status: 'passed', entries: 4 });
  const expanded = await A.extract(file, dir);
  for (const [name, data] of Object.entries(files)) expect(fs.readFileSync(path.join(expanded, name), 'utf8')).toBe(data);
});

it('accepts canonical JSZip Unicode path metadata and explicit directory entries', async () => {
  const JSZip = require('jszip'), zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('OEBPS/café.xhtml', '<html/>');
  const file = save(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  expect((await A.inspect(file)).status).toBe('passed');
  const expanded = await A.extract(file, dir);
  expect(fs.readFileSync(path.join(expanded, 'OEBPS/café.xhtml'), 'utf8')).toBe('<html/>');
});

it.each(['../outside', '/outside', 'C:/outside', 'dir\\outside', 'a/../outside', './outside', 'a//b', 'a./b', 'a /b', 'CON', 'nul.txt', 'a/COM1.txt', 'a/LPT².txt', 'a/file:stream', 'a/evil\0x', 'a/%2e%2e/b', 'a/cafe\u0301.xhtml'])('rejects unsafe or noncanonical path %s before creating output', async name => {
  const file = save(makeZip([entry(name)]));
  await rejected(file);
  await expect(A.extract(file, dir)).rejects.toMatchObject({ code: 'ALLOFLOW_EPUB_ARCHIVE_UNSAFE' });
  expect(fs.readdirSync(dir)).toEqual(['test.epub']);
});

it.each([['a','a'], ['A','a'], ['a','a/b'], ['a/b','a'], ['a/','a']])('rejects duplicate, case-colliding and file/directory conflicts %s', async (a,b) => {
  await rejected(save(makeZip([entry(a, a.endsWith('/') ? '' : 'a'), entry(b)])));
});

it.each([0xa1ff, 0x21ff, 0x11ff, 0x61ff])('rejects symbolic links and special-file modes %s', async mode => {
  const bytes = makeZip([entry('outside')]); bytes.writeUInt32LE((mode * 65536) >>> 0, central(bytes) + 38);
  await rejected(save(bytes));
});

it('rejects local/central filename disagreements, overlapping entries, trailing junk and CRC corruption', async () => {
  let bytes = makeZip([entry('safe')]); bytes[30] = 120; await rejected(save(bytes));
  bytes = makeZip([entry('a'), entry('b')]); bytes.writeUInt32LE(0, central(bytes) + 47 + 42); await rejected(save(bytes));
  bytes = Buffer.concat([makeZip([entry('a')]), Buffer.from('junk')]); await rejected(save(bytes));
  bytes = makeZip([entry('a')]); bytes.writeUInt32LE(0, 14); bytes.writeUInt32LE(0, central(bytes) + 16); await rejected(save(bytes));
});

it('rejects excess entry counts, inflated bytes, compression ratios and lying size metadata', async () => {
  let bytes = makeZip([entry('a')]); bytes.writeUInt16LE(A.LIMITS.entries + 1, bytes.length - 14); bytes.writeUInt16LE(A.LIMITS.entries + 1, bytes.length - 12); await rejected(save(bytes));
  bytes = makeZip([entry('a')]); bytes.writeUInt32LE(A.LIMITS.entryBytes + 1, central(bytes) + 24); await rejected(save(bytes));
  bytes = makeZip([entry('a', Buffer.alloc(2 * 1024 * 1024))]); await rejected(save(bytes));
  bytes = makeZip([entry('a', 'actual bytes')]); bytes.writeUInt32LE(1, 22); bytes.writeUInt32LE(1, central(bytes) + 24); await rejected(save(bytes));
});

it('enforces the total expanded-byte budget before inflating any entry', async () => {
  const bytes = makeZip(Array.from({length:5},(_,n)=>({name:'a'+n,data:Buffer.alloc(1024*1024),store:true})));
  let offset = central(bytes);
  for (let n=0;n<5;n++) {
    const local = bytes.readUInt32LE(offset+42);
    bytes.writeUInt32LE(A.LIMITS.entryBytes,offset+24); bytes.writeUInt32LE(A.LIMITS.entryBytes,local+22);
    offset += 46+bytes.readUInt16LE(offset+28);
  }
  await expect(A.inspect(save(bytes))).rejects.toThrow('inflated size or compression ratio limit exceeded');
});

it.each([1,8,64])('rejects encryption and streaming flags %s', async flags => {
  const bytes=makeZip([entry('a')]);bytes.writeUInt16LE(flags,6);bytes.writeUInt16LE(flags,central(bytes)+8);
  await rejected(save(bytes));
});

it('rejects unsupported compression and ZIP64 directory sentinels', async () => {
  let bytes=makeZip([entry('a')]); bytes.writeUInt16LE(99,8); bytes.writeUInt16LE(99,central(bytes)+10); await rejected(save(bytes));
  bytes=makeZip([entry('a')]); bytes.writeUInt32LE(0xffffffff,bytes.length-6); await rejected(save(bytes));
});

it('caps the compressed file before allocation and honours cancellation', async () => {
  const file = save(Buffer.alloc(0)), fd = fs.openSync(file, 'w'); fs.ftruncateSync(fd, A.LIMITS.archiveBytes + 1); fs.closeSync(fd);
  await rejected(file);
  const cancelled = new AbortController(); cancelled.abort();
  await expect(A.inspect(save(makeZip([entry('a')])), { signal: cancelled.signal })).rejects.toMatchObject({ code: 'ALLOFLOW_VALIDATION_CANCELLED' });
});

it('bounds snapshots and never overwrites an existing snapshot', async () => {
  const file = save(makeZip([entry('a')])), snapshot = path.join(dir, 'snapshot.epub');
  A.snapshot(file, snapshot); expect(fs.readFileSync(snapshot)).toEqual(fs.readFileSync(file));
  expect(() => A.snapshot(file, snapshot)).toThrow();
});

it('includes the archive policy in the distributed MCPB server files and verifier fingerprint', () => {
  const build = fs.readFileSync(path.resolve('desktop/mcp/build_mcpb.cjs'), 'utf8');
  const serverFiles = build.match(/const SERVER_FILES\s*=\s*\[([^\]]+)\]/)?.[1];
  expect(serverFiles).toContain("'remediation_epub_archive.cjs'");
  const validator = fs.readFileSync(path.resolve('desktop/mcp/remediation_epub_validation.cjs'), 'utf8');
  expect(validator.slice(validator.indexOf('function fingerprint()'), validator.indexOf('function parseEpubcheck'))).toContain("'remediation_epub_archive.cjs'");
});

it('fails closed in the validator before checking runtime availability or invoking downstream validators', async () => {
  let calls = 0;
  await expect(E.validate(save(makeZip([entry('../outside')])), { stateDir: dir, resolveChromium: () => { calls++; return { installed: false }; } })).rejects.toMatchObject({ code: 'ALLOFLOW_EPUB_ARCHIVE_UNSAFE' });
  expect(calls).toBe(0); expect(fs.readdirSync(dir)).toEqual(['test.epub']);
});

it('hands Ace an expanded regular-file tree and removes it after the worker exits', async () => {
  const cli = path.join(dir, 'fixture-cli.cjs'), runnerDir = path.join(dir, 'node_modules', '@daisy', 'ace-axe-runner-puppeteer');
  fs.mkdirSync(runnerDir, { recursive: true }); fs.writeFileSync(path.join(runnerDir, 'index.js'), 'module.exports={close:async()=>{}};');
  const puppeteerDir = path.join(dir, 'node_modules', 'puppeteer');
  fs.mkdirSync(puppeteerDir, { recursive: true }); fs.writeFileSync(path.join(puppeteerDir, 'index.js'), 'module.exports={launch:async()=>{throw Error("Fixture must not launch a browser")}};');
  fs.writeFileSync(cli, "const fs=require('fs'),path=require('path'),root=process.argv.at(-1); if(!fs.statSync(root).isDirectory())throw Error('Archive reached Ace'); process.stdout.write(JSON.stringify({content:fs.readFileSync(path.join(root,'mimetype'),'utf8')}));");
  const file = save(makeZip([{ name: 'mimetype', data: 'application/epub+zip', store: true }]));
  const worker = path.resolve('desktop/mcp/remediation_ace_worker.cjs');
  let result = spawnSync(process.execPath, [worker, cli, file], { encoding: 'utf8', timeout: 10000 });
  expect(result.status, result.stderr).toBe(0); expect(JSON.parse(result.stdout).content).toBe('application/epub+zip');
  expect(fs.readdirSync(dir).some(name => name.startsWith('epub-expanded-'))).toBe(false);
  save(makeZip([entry('../outside')]));
  result = spawnSync(process.execPath, [worker, cli, file], { encoding: 'utf8', timeout: 10000 });
  expect(result.status).toBe(1); expect(result.stdout).toBe(''); expect(result.stderr).toContain('EPUB archive rejected');
});
