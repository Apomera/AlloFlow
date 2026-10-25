import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
const require = createRequire(import.meta.url);
const { LIMITS, readConfigurationJson } = require('../desktop/mcp/agent_core_stdio_security.cjs');
const scratch = resolve('tmp'); mkdirSync(scratch, { recursive:true });
const dir = mkdtempSync(join(scratch,'mcp-config-security-'));
let sequence = 0;
const fixture = content => { const file = join(dir,`synthetic-private-name-${++sequence}.json`); writeFileSync(file,content); return file; };
afterAll(() => { if (dirname(dir) !== scratch || !basename(dir).startsWith('mcp-config-security-')) throw Error('Unexpected cleanup target'); rmSync(dir,{recursive:true,force:true}); });

function launch(manifest, inventory) {
  const env = { ...process.env, ALLOFLOW_MCP_DATA_DIR: dir };
  delete env.ALLOFLOW_MCP_MANIFEST_PATH; delete env.ALLOFLOW_MCP_MEDIA_INVENTORY_PATH;
  if (manifest) env.ALLOFLOW_MCP_MANIFEST_PATH = manifest;
  if (inventory) env.ALLOFLOW_MCP_MEDIA_INVENTORY_PATH = inventory;
  const messages = [
    { jsonrpc:'2.0', id:1, method:'initialize', params:{protocolVersion:'2025-06-18'} },
    { jsonrpc:'2.0', id:2, method:'tools/call', params:{name:'capabilities',arguments:{}} },
    { jsonrpc:'2.0', id:3, method:'tools/call', params:{name:'blueprint_create',arguments:{request:{blueprintId:'config-test',plan:['analysis']}}} },
  ];
  const result = spawnSync(process.execPath,[resolve('desktop/mcp/alloflow-mcp-stdio.cjs')],{env,input:messages.map(m=>JSON.stringify(m)).join('\n')+'\n',encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:1000000});
  expect(result.error).toBeUndefined(); expect(result.status,result.stderr).toBe(0);
  return { stderr:result.stderr, responses:result.stdout.trim().split('\n').map(line=>JSON.parse(line)) };
}
describe('MCP startup configuration boundary', () => {
  it('preserves valid UTF-8 configuration exactly', () => {
    const expected = {schemaVersion:'1.0', deploymentMode:'desktop-local', permissions:['artifact:read'], label:'日本語 / العربية / 🌱'};
    expect(readConfigurationJson(fixture(JSON.stringify(expected)))).toEqual(expected);
  });
  it('rejects oversized files before parsing and caps nesting/value counts', () => {
    const overBytes = fixture(' '.repeat(LIMITS.configBytes + 1));
    const wide = fixture(JSON.stringify(Array(LIMITS.configValues + 1).fill(0)));
    const deep = fixture('['.repeat(LIMITS.configDepth + 2) + '0' + ']'.repeat(LIMITS.configDepth + 2));
    for (const file of [overBytes,wide,deep]) expect(()=>readConfigurationJson(file)).toThrow(/bounded regular UTF-8 JSON/);
  });
  it('does not expose malformed content, filenames, or raw filesystem errors', () => {
    for (const file of [fixture('synthetic-private-configuration'), fixture(Buffer.from([0x22,0xff,0x22])), join(dir,'synthetic-private-missing.json'), dir]) {
      let error;
      try { readConfigurationJson(file); } catch(e) { error=e; }
      expect(error?.code).toBe('ALLOFLOW_CONFIG_INVALID');
      expect(error.message).not.toMatch(/synthetic-private|ENOENT|EISDIR|Unexpected token/);
    }
  });
  it('supports tightening the file boundary without widening defaults', () => {
    const value = JSON.stringify({test:'valid'}), file=fixture(value);
    expect(readConfigurationJson(file,{...LIMITS,configBytes:Buffer.byteLength(value)})).toEqual({test:'valid'});
    expect(()=>readConfigurationJson(file,{...LIMITS,configBytes:Buffer.byteLength(value)-1})).toThrow();
  });
  it('keeps an invalid configured manifest fail-closed and startup logs redacted', () => {
    for (const content of ['synthetic-private-configuration', ' '.repeat(LIMITS.configBytes + 1), '['.repeat(18)+'0'+']'.repeat(18)]) {
      const result=launch(fixture(content));
      expect(result.responses.find(m=>m.id===2).result.structuredContent.permissions).toEqual([]);
      expect(result.responses.find(m=>m.id===3).error.code).toBe(-32003);
      expect(result.stderr).not.toContain('synthetic-private');
    }
  });
  it('handles a malformed media inventory without leaking its JSON parse excerpt', () => {
    const result=launch(undefined,fixture('synthetic-private-inventory'));
    expect(result.stderr).toContain('using empty inventory');
    expect(result.stderr).not.toMatch(/synthetic-private|Unexpected token/);
    expect(result.responses.find(m=>m.id===2).result.structuredContent.permissions).toEqual(['artifact:read','artifact:draft']);
    expect(result.responses.find(m=>m.id===3).result.structuredContent.job.status).toBe('completed');
  });
  it('preserves valid read-only manifests and empty media inventories without logging their names', () => {
    const manifest=fixture(JSON.stringify({schemaVersion:'1.0',deploymentMode:'desktop-local',permissions:['artifact:read']}));
    const inventory=fixture(JSON.stringify({schemaVersion:'1.0',providers:[]}));
    const result=launch(manifest,inventory);
    expect(result.responses.find(m=>m.id===2).result.structuredContent.permissions).toEqual(['artifact:read']);
    expect(result.responses.find(m=>m.id===3).error.code).toBe(-32003);
    expect(result.stderr).not.toContain('synthetic-private-name');
    expect(result.stderr).toContain('configured media inventory loaded');
  });
});
