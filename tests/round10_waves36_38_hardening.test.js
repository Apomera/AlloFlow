import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function extractFunction(src, name) {
  const sig = `function ${name}(`;
  const start = src.indexOf(sig);
  if (start < 0) throw new Error(`Function ${name} not found`);
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

describe('Round 10 Wave 36: Remote MCP Service security & lifecycle hardening', () => {
  it('strips upstream refresh tokens from accessTokenProps and revokes grants on terminal invalid_grant', () => {
    const auth = read('services/alloflow-remote-mcp/src/access-auth.ts');
    const index = read('services/alloflow-remote-mcp/src/pilot-index.ts');

    expect(auth).toContain('function accessTokenPropsFor(');
    expect(auth).toContain('accessTokenProps: accessTokenPropsFor(principal, validatedScopes)');
    expect(auth).toContain('accessTokenProps: accessTokenPropsFor(refreshed, validatedScopes)');
    expect(auth).toContain('!constantTimeEqual(principal.ownerId, options.userId)');
    expect(auth).toContain('await revokeGrantBestEffort(env, options.grantId, options.userId, revokeGrantFn)');
    expect(auth).toContain('if (options.grantType !== "refresh_token")');
    expect(auth).toContain('throw new OAuthError("unsupported_grant_type"');
    expect(auth).toContain('throw new OAuthError("invalid_scope"');
    expect(auth).toContain('function isAllowedRedirectUri(');
    expect(auth).toContain('throw new PilotError("invalid_redirect_uri", 400)');
    expect(auth).toContain('!stored.nonce');
    expect(index).toContain('getOAuthApi(providerOptions, env).revokeGrant(grantId, userId)');
  });

  it('enforces upload/input TTL ordering, fenced upload/job cleanup, and artifact-safe metadata purge', () => {
    const envTs = read('services/alloflow-remote-mcp/src/pilot-env.ts');
    const store = read('services/alloflow-remote-mcp/src/job-store.ts');
    const ops = read('services/alloflow-remote-mcp/src/pilot-operations.ts');

    expect(envTs).toContain('if (unstartedInputTtlSeconds < uploadTtlSeconds)');
    expect(store).toContain("WHERE id = ? AND status = 'uploading' AND deleted_at IS NULL");
    expect(store).toContain('export async function claimExpiredUploadForDeletion(');
    expect(store).toContain('AND input_key IS NULL\n         AND result_key IS NULL\n         AND report_key IS NULL');
    expect(store).toContain('const completedGraceCutoff = now - 300;');
    expect(store).toContain('AND created_at > ?');
    expect(ops.indexOf('await listCleanupJobs(env, config)')).toBeLessThan(
      ops.indexOf('await listDispatchPendingJobs(env, config)'),
    );
    expect(ops).toContain('if (!(await claimExpiredUploadForDeletion(env, upload.id)))');
  });

  it('hardens container output/checkpoint/Gemini memory bounds, transfer ordering, workflow scores, and IPv6 /64 DCR rate limiting', () => {
    const container = read('services/alloflow-remote-mcp/src/remediation-container.ts');
    const transfer = read('services/alloflow-remote-mcp/src/document-transfer.ts');
    const workflow = read('services/alloflow-remote-mcp/src/remediation-workflow.ts');
    const guard = read('services/alloflow-remote-mcp/src/registration-guard.ts');

    expect(container).not.toContain('Uint8Array.from(bodyBytes).buffer');
    expect(container).toContain('onlyIf: { etagDoesNotMatch: "*" }');
    expect(container).toContain('const size = contentLength(request, 1024 * 1024);');
    expect(container).toContain('if (!(current.status === "completed" && current.attempt_id === attemptId))');
    expect(container).toContain('superseded_checkpoint_delete_failed');

    expect(transfer.indexOf('await rejectUpload(env, uploadId);')).toBeLessThan(
      transfer.indexOf('rejected = true;'),
    );
    expect(transfer).toContain('ownedJob.status !== "completed" ||');
    expect(transfer).toContain('ownedJob.output_expires_at <= nowSeconds()');

    expect(workflow).toContain('Number.isFinite(value) &&');
    expect(workflow).toContain('jobArtifactKeysForAttempt(job, attempt)');
    expect(workflow).toContain('if (keys.length > 0)');

    expect(guard).toContain('function normalizeRateLimitIp(');
    expect(guard).toContain('::/64');
    expect(guard).toContain('const institutionLimit = await env.DCR_RATE_LIMITER.limit({');
  });
});

describe('Round 10 Wave 37: Standalone studios Part 1 hardening', () => {
  it('hardens whiteboard bridge protocol, recorder error/timeout fallbacks, and GIF telemetry', () => {
    const wb = read('whiteboard/whiteboard.html');
    const fnSrc = extractFunction(wb, 'isTrustedOpenerOrigin');
    const ctx = { URL, declaredHost: 'https://alloflow-cdn.pages.dev' };
    vm.runInNewContext(`${fnSrc}; this.check = isTrustedOpenerOrigin;`, ctx);
    expect(ctx.check('http://localhost:5173')).toBe(true);
    expect(ctx.check('https://127.0.0.1:8443')).toBe(true);
    expect(ctx.check('ftp://localhost')).toBe(false);
    expect(ctx.check('javascript://localhost/%0aalert(1)')).toBe(false);

    expect(wb).toContain('if (ev.origin === \'null\' && declaredHost && declaredHost !== \'null\') return;');
    expect(wb).toContain('if (linked) return;');
    expect(wb).toContain("if (target === '*' && !linked)");
    expect(wb).toContain('var gifSaved = false;');
    expect(wb).toContain('gif: gifSaved');
    expect(wb).toContain('gifFrames.length = 0; recordBusy = false;');
    expect(wb).toContain('Promise.race([');
  });

  it('tightens Zoom Gallery & Timeline Studio origin isolation, CSP, and WCAG 2.2 AA controls', () => {
    const zg = read('zoom_gallery/zoom_gallery.html');
    const zgMod = read('stem_lab/stem_tool_zoomgallery.js');
    const tl = read('timeline_studio/timeline_studio.html');
    const tlMod = read('timeline_studio_module.js');

    expect(zg).toContain("script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;");
    expect(zg).toContain("frame-src 'none';");
    expect(zgMod).toContain("'&host=' + encodeURIComponent(window.location.origin)");
    expect(tlMod).toContain("withParam(popupUrl, 'host', window.location.origin)");

    for (const html of [zg, tl]) {
      const fnSrc = extractFunction(html, 'isTrustedOrigin');
      const ctxNoHost = { URL, URLSearchParams, window: { location: { origin: 'https://alloflow-cdn.pages.dev', search: '' } } };
      vm.runInNewContext(`${fnSrc}; this.check = isTrustedOrigin;`, ctxNoHost);
      expect(ctxNoHost.check('https://evil.usercontent.goog')).toBe(false);
      expect(ctxNoHost.check('ftp://localhost')).toBe(false);

      const ctxWithHost = {
        URL,
        URLSearchParams,
        window: { location: { origin: 'https://alloflow-cdn.pages.dev', search: '?host=https%3A%2F%2Fmycanvas.usercontent.goog' } },
      };
      vm.runInNewContext(`${fnSrc}; this.check = isTrustedOrigin;`, ctxWithHost);
      expect(ctxWithHost.check('https://mycanvas.usercontent.goog')).toBe(true);
      expect(ctxWithHost.check('https://other.usercontent.goog')).toBe(false);
    }

    expect(zg).toContain('role="tabpanel" aria-labelledby="tabNotice"');
    expect(zg).toContain('aria-controls="coachBody"');
    expect(zg).toContain("e.key === 'ArrowRight'");
    expect(zg).toContain('role="status" aria-live="polite"');
    expect(zg).toContain('--chip-pin: #fbbf24');
    expect(tl).toContain('id="drawerStatus"');
    expect(tl).toContain('function plainTimelineLabel(');
    expect(tl).toContain(':root[data-theme="contrast"] button.go { background: var(--accent2); color: #000; }');
  });

  it('hardens IT Screen Coach & Text Inquiry Studio lifecycle, races, and a11y', () => {
    const ic = read('it_coach/it_coach.html');
    const ti = read('text_inquiry/text_inquiry.html');

    expect(ic).toContain("script-src 'self' 'unsafe-inline'; frame-src 'none';");
    expect(ic).toContain('var startingPip = false;');
    expect(ic).toContain('if (cv.width !== v.videoWidth || cv.height !== v.videoHeight)');
    expect(ic).toContain("if (track && track.readyState === 'ended')");
    expect(ic).toContain("err === 'audio-capture' || err === 'network' || err === 'language-not-supported'");
    expect(ic).toContain('req.timedOut = true;');
    expect(ic).toContain('if (shouldSpeakAnswer) speak(answer, true, resumeHandsFreeChat);');
    expect(ic).toContain('}, 2000);');

    expect(ti.match(/function citationText\(/g)).toHaveLength(1);
    expect(ti).toContain('verifySourceSeq+=1;');
    expect(ti).toContain('id="concordanceSummary" role="status" aria-live="polite"');
    expect(ti).toContain("use.setAttribute('aria-label','Use this source: '+row.title)");
    expect(ti).toContain("els.sourceSearchBtn.setAttribute('aria-busy','true')");
    expect(ti).toContain('URL.revokeObjectURL(url);},2000)');
  });
});

describe('Round 10 Wave 38: Standalone studios Part 2 & AlloSheet UI hardening', () => {
  it('computes exact Horn alignment on 180-degree rotations and redacts spaced FASTA blocks in AlphaFold Explorer', () => {
    const af = read('alphafold_explorer/alphafold_explorer.html');
    const qRot = extractFunction(af, 'quaternionRotation');
    const rPt = extractFunction(af, 'rotatePoint');
    const align = extractFunction(af, 'calculateAlignment');
    const redact = extractFunction(af, 'redactSequenceLikeText');

    const ctx = {};
    vm.runInNewContext(`${qRot}\n${rPt}\n${align}\n${redact}\nthis.api={calculateAlignment,redactSequenceLikeText};`, ctx);

    // 180-degree rotation about the Z axis: (x, y, z) -> (-x, -y, z) + translation (10, -5, 3)
    const origPts = [
      [1.2, 0.5, 0.0],
      [3.8, 1.7, 0.4],
      [5.1, -2.2, 1.9],
      [2.0, -3.5, -1.1],
      [-1.4, 2.8, 2.3],
    ];
    const pairs = origPts.map((pt, idx) => ({
      original: { key: `A:${idx + 1}`, residue: 'ALA', point: pt },
      variant: { key: `A:${idx + 1}`, residue: 'ALA', point: [-pt[0] + 10, -pt[1] - 5, pt[2] + 3] },
    }));
    const res = ctx.api.calculateAlignment(pairs);
    expect(res.rmsd).toBeLessThan(1e-6);

    // Spaced/numbered FASTA sequence block must be redacted
    const spacedProtein = 'Note: 10 MKTAYIAKQR QISFVKSHFS RQLEERLGLIE VQAPILSRVG DGTQDNLSGA EKAVQVKVKA';
    const redacted = ctx.api.redactSequenceLikeText(spacedProtein);
    expect(redacted).toContain('[protein sequence omitted]');
    expect(redacted).not.toContain('MKTAYIAKQR');
    // Normal classroom prose remains untouched
    const prose = 'The folded core shows high confidence while the flexible terminal loop stays low.';
    expect(ctx.api.redactSequenceLikeText(prose)).toBe(prose);

    expect(af).not.toContain('alloflow.example');
    expect(af).toContain('function safeApiUrl(');
    expect(af).toContain("rel: 'noopener noreferrer'");
    expect(af).toContain('var annotationLoadVersion = 0;');
    expect(af).toContain('var alignedObjectUrl = \'\';');
    expect(af).toContain('redactSequenceLikeText(noteInput.value.trim()).slice(0, 600)');
    expect(af).not.toContain('id="claimReview" class="reviewBox" aria-live="polite"');
  });

  it('handles Object.prototype category keys safely in Data Lab and strips alloflow.example + interval leaks', () => {
    const dl = read('data_lab/data_lab.html');
    const colFn = extractFunction(dl, 'column');
    const idxFn = extractFunction(dl, 'attrIndex');
    const medFn = extractFunction(dl, 'median');
    const grpFn = extractFunction(dl, 'evaluateGroup');
    const lblFn = extractFunction(dl, 'groupLabels');
    const modeFn = extractFunction(dl, 'evaluateMode');

    const ctx = {};
    vm.runInNewContext(
      `${idxFn}\n${colFn}\n${medFn}\n${grpFn}\n${lblFn}\n${modeFn}\nthis.api={evaluateGroup,groupLabels,evaluateMode};`,
      ctx,
    );
    const ds = {
      attributes: [{ key: 'cat', name: 'Category' }, { key: 'val', name: 'Value' }],
      rows: [
        ['constructor', 10],
        ['constructor', 20],
        ['toString', 5],
        ['hasOwnProperty', 30],
      ],
    };
    expect(ctx.api.groupLabels(ds, 'cat')).toEqual(['constructor', 'toString', 'hasOwnProperty']);
    const grouped = ctx.api.evaluateGroup(ds, { group: 'cat', attr: 'val' });
    expect(grouped.top).toBe('hasOwnProperty');
    expect(grouped.groups).toHaveLength(3);
    const mode = ctx.api.evaluateMode(ds, { attr: 'cat' });
    expect(mode).toEqual({ tops: ['constructor'], n: 2, total: 4 });

    expect(dl).not.toContain('alloflow.example');
    expect(dl).toContain('var codapContexts = Object.create(null);');
    expect(dl).toContain('function stopOpenerCheck()');
    expect(dl).toContain('outline-color: #1d4ed8 !important;');
  });

  it('hardens Immersive Geometry URL scrubbing/keyboard isolation and AlloSheet casebook draft preservation', () => {
    const ig = read('immersive_geometry/immersive_geometry.html');
    const as = read('allo_sheet/allo_sheet.js');
    const cb = read('allo_sheet/allo_sheet_casebook_ui.js');

    expect(ig).toContain('var LAUNCH_STRIP_KEYS =');
    expect(ig).toContain("'paneldistance','panelsize','panelheight','color','opacity','bridge','parentOrigin','bridgeUnit'");
    expect(ig).toContain('if (findDialog && findDialog.open) return;');
    expect(ig).toContain('/^(A|SUMMARY)$/.test(e.target.tagName)');

    expect(as).toContain('} catch (_) {} finally {');
    expect(cb).toContain('var renderedDraft = null;');
    expect(cb).toContain('function syncDraftErrorDescribedBy(');
    expect(cb).toContain("hintEl.id = 'casebookDraftHint_' + paramIndex;");
    expect(cb).toContain('if (renderedDraft !== draft || (draftPanel && draftPanel.hidden))');
    expect(cb).toContain('remainingButtons[Math.min(removedIndex, remainingButtons.length - 1)].focus();');
  });
});
