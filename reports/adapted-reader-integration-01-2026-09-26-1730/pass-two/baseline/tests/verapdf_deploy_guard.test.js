import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const deploy = readFileSync(resolve(process.cwd(), 'deploy.sh'), 'utf8');
const guardStart = deploy.indexOf('# ── Check 4: veraPDF runtime artifacts (HARD)');
const guardEnd = deploy.indexOf('\nfi\n\n# ── Done', guardStart);
const guard = guardStart >= 0 && guardEnd > guardStart ? deploy.slice(guardStart, guardEnd) : '';

describe('veraPDF production deploy guard', () => {
  it('checks the configured validator route used by the PDF audit UI', () => {
    expect(guard).toContain('VERAPDF_VALIDATOR_ROUTE="verapdf/verapdf_validator.html"');
  });

  it('cache-busts both probes, including every propagation retry', () => {
    expect(deploy).toMatch(/POST_VERIFY_CACHE_BUST=.*BUILD_HASH.*date \+%s/);
    expect(guard).toContain('VERA_QUERY="${POST_VERIFY_CACHE_BUST}-${VERAPDF_ATTEMPT}"');
    expect(guard.match(/\?verify=\$VERA_QUERY/g)).toHaveLength(2);
    expect(guard.match(/Cache-Control: no-cache, no-store/g)).toHaveLength(2);
    expect(guard.match(/Pragma: no-cache/g)).toHaveLength(2);
  });

  it('rejects a 200 SPA fallback in place of the validator HTML', () => {
    expect(guard).toContain('VERA_HTML_CODE');
    expect(guard).toContain('Independent PDF/UA-1 validator');
    expect(guard).toContain("type: 'verapdf-ready'");
    expect(guard).toContain('boot();');
    expect(guard).toMatch(/likely SPA fallback/);
    expect(guard).toMatch(/pv_fail "\$VERAPDF_VALIDATOR_ROUTE/);
  });

  it('requires the CLI download to be a nontrivial ZIP/JAR, not HTML', () => {
    expect(guard).toContain('VERAPDF_CLI_JAR_ROUTE="verapdf/verapdf-cli.jar"');
    expect(guard).toContain('-D "$VERA_JAR_HEADERS"');
    expect(guard).toMatch(/VERA_JAR_TYPE=.*content-type:/);
    expect(guard).toContain('VERA_JAR_MAGIC');
    expect(guard).toContain('"504b0304"');
    expect(guard).toMatch(/VERA_JAR_SIZE:-0}" -lt 1000000/);
    expect(guard).toMatch(/VERA_JAR_TYPE" == text\/html/);
    expect(guard).toMatch(/pv_fail "\$VERAPDF_CLI_JAR_ROUTE/);
  });

  it('keeps the existing committed-module MD5 freshness checks intact', () => {
    expect(deploy).toContain('LOCAL_MD5=$(git show "HEAD:$mod"');
    expect(deploy).toContain('CDN_MD5=$(md5sum "$TMP"');
    expect(deploy).toContain('if [[ "$CDN_MD5" == "$LOCAL_MD5" ]]');
  });
});
