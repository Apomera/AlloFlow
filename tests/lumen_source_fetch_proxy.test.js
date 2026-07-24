import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const Fetch = require('../desktop/web-app/functions/web_source_fetch.js');

function readableHtml(label = 'Evidence article') {
  return `<!doctype html><html><head><title>${label} &amp; Research</title></head><body><nav>Skip this menu</nav><main><h1>${label}</h1><p>This public educational page contains enough meaningful readable source text for Lumen to preserve evidence passages, cite exact excerpts, and answer later questions without relying on the search-result preview.</p><p>It includes a second paragraph so the extraction result represents the complete article body.</p></main><script>window.secret = true;</script></body></html>`;
}

function publicLookup(address = '93.184.216.34') {
  return vi.fn(async () => [{ address, family: address.includes(':') ? 6 : 4 }]);
}

describe('Lumen first-party source fetch network boundary', () => {
  it('allows globally routable IPv4 and IPv6 while blocking non-public ranges', () => {
    expect(Fetch.isPublicIp('8.8.8.8')).toBe(true);
    expect(Fetch.isPublicIp('2001:4860:4860::8888')).toBe(true);
    for (const address of [
      '0.0.0.1', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.169.254',
      '172.16.0.1', '192.168.1.1', '192.0.2.1', '198.51.100.1', '203.0.113.1',
      '224.0.0.1', '::', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1'
    ]) expect(Fetch.isPublicIp(address)).toBe(false);
  });

  it('rejects credentials, non-web schemes, internal names and nonstandard ports', () => {
    for (const url of [
      'file:///etc/passwd', 'https://user:pass@example.org/', 'http://localhost/',
      'https://metadata.google.internal/', 'https://example.org:8443/private'
    ]) expect(() => Fetch.validatePublicHttpUrl(url)).toThrow();
    expect(Fetch.validatePublicHttpUrl('https://example.org:443/article#notes').toString()).toBe('https://example.org/article');
  });

  it('fails closed when any DNS answer is private or reserved', async () => {
    const lookup = vi.fn(async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.1.2.3', family: 4 }
    ]);
    await expect(Fetch.assertPublicTarget('https://example.org/article', { lookup })).rejects.toMatchObject({ code: 'blocked-target', status: 403 });
  });

  it('revalidates a redirect before making the next request', async () => {
    const requestImpl = vi.fn(async () => ({ status: 302, headers: { location: 'http://127.0.0.1/admin' }, body: Buffer.alloc(0) }));
    await expect(Fetch.fetchPublicPage('https://example.org/start', {
      lookup: publicLookup(), requestImpl
    })).rejects.toMatchObject({ code: 'blocked-target' });
    expect(requestImpl).toHaveBeenCalledTimes(1);
  });

  it('pins each approved hop and returns readable text after a public redirect', async () => {
    const lookup = publicLookup();
    const requestImpl = vi.fn(async (url, addresses) => {
      expect(addresses).toEqual([{ address: '93.184.216.34', family: 4 }]);
      if (url.pathname === '/start') return { status: 302, headers: { location: '/article' }, body: Buffer.alloc(0) };
      return { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Buffer.from(readableHtml()) };
    });
    const result = await Fetch.fetchPublicPage('https://example.org/start', { lookup, requestImpl });
    expect(result).toMatchObject({ url: 'https://example.org/article', title: 'Evidence article & Research', contentType: 'text/html', redirects: 1 });
    expect(result.text).toContain('complete article body');
    expect(result.text).not.toContain('Skip this menu');
    expect(result.text).not.toContain('window.secret');
    expect(requestImpl).toHaveBeenCalledTimes(2);
  });

  it('enforces response-size and supported-content-type limits', async () => {
    await expect(Fetch.fetchPublicPage('https://example.org/large', {
      lookup: publicLookup(), maxBytes: 1024,
      requestImpl: async () => ({ status: 200, headers: { 'content-type': 'text/plain' }, body: Buffer.alloc(1025, 65) })
    })).rejects.toMatchObject({ code: 'source-too-large', status: 413 });

    await expect(Fetch.fetchPublicPage('https://example.org/file.pdf', {
      lookup: publicLookup(),
      requestImpl: async () => ({ status: 200, headers: { 'content-type': 'application/pdf' }, body: Buffer.from('%PDF text') })
    })).rejects.toMatchObject({ code: 'unsupported-content-type', status: 415 });
  });

  it('serves the safe importer through the desktop embedded-app route without exposing local targets', async () => {
    const runtime = require('../desktop/runtime/alloflow-desktop-runtime.cjs');
    const server = runtime.createServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/api/sourceFetchProxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'http://127.0.0.1/private' })
      });
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ error: 'blocked-target' });

      const crossOrigin = await fetch('http://127.0.0.1:' + port + '/api/sourceFetchProxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
        body: JSON.stringify({ url: 'https://example.org/' })
      });
      expect(crossOrigin.status).toBe(403);
      await expect(crossOrigin.json()).resolves.toMatchObject({ error: 'Cross-origin request rejected.' });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('keeps the cloud and desktop safety cores byte-identical', () => {
    const cloud = fs.readFileSync('desktop/web-app/functions/web_source_fetch.js');
    const desktop = fs.readFileSync('desktop/runtime/web-source-fetch.cjs');
    expect(desktop.equals(cloud)).toBe(true);
  });
});
