# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-wing-silhouettes.spec.ts >> Raptor continuous wing outlines >> keeps a complete, symmetric, folding wing: peregrine low
- Location: tests\e2e\raptor-wing-silhouettes.spec.ts:35:9

# Error details

```
TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
```

# Test source

```ts
  612 | 
  613 |   /** Call in test.beforeAll. */
  614 |   async start(): Promise<void> {
  615 |     // Resolved once per run. Asking for app styles and silently not getting them
  616 |     // would make a colour-contrast pass meaningless, so an absent bundle is an error.
  617 |     let appCss: string | null = null;
  618 |     if (this.opts.appStyles) {
  619 |       appCss = findAppStylesheet();
  620 |       if (!appCss) {
  621 |         throw new Error(
  622 |           'appStyles was requested but no app/static/css/main.*.css exists in the tree. '
  623 |           + 'Build the web app first, or drop appStyles for this spec.');
  624 |       }
  625 |     }
  626 |     const substitutes = parseSubstitutes(process.env.STEM_GL_SUBSTITUTE);
  627 |     for (const [rel, file] of substitutes) {
  628 |       // eslint-disable-next-line no-console
  629 |       console.warn(`[stem_gl_harness] STEM_GL_SUBSTITUTE is serving ${file} in place of ${rel}`);
  630 |     }
  631 |     const html = harnessHtml(this.opts, appCss, [...substitutes.keys()]);
  632 |     this.server = createServer(async (req, res) => {
  633 |       const url = (req.url || '/').split('?')[0];
  634 |       if (url === '/__harness') {
  635 |         res.writeHead(200, { 'content-type': MIME['.html'] });
  636 |         res.end(html);
  637 |         return;
  638 |       }
  639 |       try {
  640 |         // Serve the working tree, refusing to climb out of it.
  641 |         const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
  642 |         const sub = substitutes.get(rel.replace(/\\/g, '/'));
  643 |         const file = sub || join(ROOT, rel);
  644 |         if (!sub && !file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
  645 |         const body = await readFile(file);
  646 |         res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  647 |         res.end(body);
  648 |       } catch {
  649 |         res.writeHead(404);
  650 |         res.end('not found');
  651 |       }
  652 |     });
  653 |     await new Promise<void>((r) => this.server!.listen(0, '127.0.0.1', r));
  654 |     const addr = this.server.address();
  655 |     this.base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  656 |   }
  657 | 
  658 |   /** Harness URL, for throwaway probes that drive the page directly. */
  659 |   get url(): string { return this.base; }
  660 | 
  661 |   /** Call in test.afterAll. */
  662 |   async stop(): Promise<void> {
  663 |     if (this.server) await new Promise<void>((r) => this.server!.close(() => r()));
  664 |     this.server = null;
  665 |   }
  666 | 
  667 |   /**
  668 |    * Navigate, mount the tool, and wait for a canvas.
  669 |    * `readyExpr` is an in-page boolean expression polled after the canvas appears —
  670 |    * use it to wait for the tool's own engine global.
  671 |    */
  672 |   async mount(
  673 |     page: Page,
  674 |     toolData: Record<string, unknown> = {},
  675 |     readyExpr?: string,
  676 |     // Some views legitimately have no 3D surface (a tool's first phase, a 2D tab).
  677 |     // Waiting for a canvas there just times out and reads like a failure.
  678 |     opts: { expectCanvas?: boolean } = {},
  679 |   ): Promise<void> {
  680 |     const expectCanvas = opts.expectCanvas !== false;
  681 |     await page.goto(`${this.base}/__harness`);
  682 |     await page.waitForFunction(
  683 |       (id) => !!(window as any).StemLab?._registry?.[id], this.opts.toolId, { timeout: 30000 });
  684 |     await page.evaluate((d) => (window as any).__mount(d), toolData);
  685 |     if (!expectCanvas) { await page.waitForTimeout(900); return; }
  686 |     try {
  687 |       // ANY visible canvas. waitForSelector('#wrap canvas') judged only the FIRST
  688 |       // match, so a tool whose first canvas is a hidden 0x0 helper timed out beside
  689 |       // a visible 1275x570 scene (solarSystem rover view, 2026-09-22).
  690 |       await page.waitForFunction(() => [...document.querySelectorAll('#wrap canvas')].some((c) => {
  691 |         const b = c.getBoundingClientRect();
  692 |         return b.width > 0 && b.height > 0 && getComputedStyle(c).visibility !== 'hidden';
  693 |       }), null, { timeout: 30000 });
  694 |     } catch (err) {
  695 |       // "Timeout exceeded" alone sent the last triage down the wrong path: the
  696 |       // canvases existed, they were 0px wide, and the wait is for a VISIBLE one.
  697 |       const seen = await page.evaluate(() => [...document.querySelectorAll('#wrap canvas')]
  698 |         .map((c) => { const b = c.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; }))
  699 |         .catch(() => [] as string[]);
  700 |       throw new Error(`${this.opts.toolId}: no VISIBLE canvas in #wrap after 30s `
  701 |         + `(canvases present, CSS px: [${seen.join(', ') || 'none'}]). If every one is 0px wide, `
  702 |         + `the tool root may have collapsed inside the flex #wrap; try layout: 'document'.\n${(err as Error).message}`);
  703 |     }
  704 |     // Wait for a GL context that is actually usable. A canvas exists in the DOM
  705 |     // before three.js has finished with it, and probing too early reports the
  706 |     // context as lost — which reads exactly like a real failure.
  707 |     await page.waitForFunction(() => {
  708 |       const h = (window as any).__glCanvas();
  709 |       return !!h && !h.gl.isContextLost();
  710 |     }, null, { timeout: 30000 }).catch(() => { /* leave it to the assertions */ });
  711 |     if (readyExpr) {
> 712 |       await page.waitForFunction(`(function(){ return !!(${readyExpr}); })()`, null, { timeout: 30000 });
      |                  ^ TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
  713 |     }
  714 |     await page.waitForTimeout(700); // let three.js settle a few frames
  715 |   }
  716 | 
  717 |   /** Tear the scene down — see trap 1. Safe to call when nothing is mounted. */
  718 |   async destroy(page: Page): Promise<void> {
  719 |     await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* already gone */ } }).catch(() => {});
  720 |   }
  721 | 
  722 |   /**
  723 |    * Unmount the tool WITHOUT the harness's own GL cleanup, so what is still live
  724 |    * afterwards is what the tool left behind. Follow with destroy() (afterEach does).
  725 |    */
  726 |   async unmount(page: Page): Promise<void> {
  727 |     await page.evaluate(() => (window as any).__unmount());
  728 |   }
  729 | 
  730 |   /** Every GL context the page created (optionally only those of one mount). */
  731 |   async glContexts(page: Page, mount?: number): Promise<GlContextRecord[]> {
  732 |     return page.evaluate((m) => (window as any).__glContexts(m), mount);
  733 |   }
  734 | 
  735 |   /** The current __mount() generation, for glContexts(page, mount). */
  736 |   async currentMount(page: Page): Promise<number> {
  737 |     return page.evaluate(() => (window as any).__glRecorder.mount);
  738 |   }
  739 | 
  740 |   /** Mesh census of what three.js last drew on the GL canvas; null if there is none. */
  741 |   async glScene(page: Page, sel?: string): Promise<GlSceneCensus | null> {
  742 |     return page.evaluate((s) => (window as any).__glScene(s), sel);
  743 |   }
  744 | 
  745 |   /**
  746 |    * After unmount(): wait (up to timeoutMs) for every context the tool was responsible
  747 |    * for to be lost, and return the ones still live. unmount() notes them: live contexts
  748 |    * made during this mount OR sitting in #wrap, so a renderer built before the mount
  749 |    * cannot slip past. Tools release on a deferred tick (StemLab.releaseGl uses
  750 |    * setTimeout 0), so an immediate read is too early.
  751 |    */
  752 |   async leakedAfterUnmount(page: Page, timeoutMs = 5000): Promise<GlContextRecord[]> {
  753 |     const deadline = Date.now() + timeoutMs;
  754 |     let live: GlContextRecord[] = [];
  755 |     for (;;) {
  756 |       const watched: GlContextRecord[] | null = await page.evaluate(() => (window as any).__glWatched());
  757 |       // Without the note this would return [] and pass every tool: refuse instead.
  758 |       if (!watched) throw new Error('leakedAfterUnmount: call harness.unmount(page) first');
  759 |       live = watched.filter((c) => !c.lost);
  760 |       if (!live.length || Date.now() > deadline) return live;
  761 |       await page.waitForTimeout(100);
  762 |     }
  763 |   }
  764 | 
  765 |   /**
  766 |    * Photograph the GL canvas's OWN pixels and summarise them (see trap 4). Every other
  767 |    * element is hidden and the canvas's CSS background is forced to flat magenta for the
  768 |    * shot, so a canvas with no GL content comes out as one flat colour. Returns null if
  769 |    * the page has no recorded GL canvas under `sel`.
  770 |    */
  771 |   async glPixels(page: Page, sel?: string): Promise<(PixelStats & { png: Buffer }) | null> {
  772 |     const tagged = await page.evaluate((s) => {
  773 |       document.querySelectorAll('[data-gl-pixels-under-test]')
  774 |         .forEach((n) => n.removeAttribute('data-gl-pixels-under-test'));
  775 |       const hit = (window as any).__glCanvas(s);
  776 |       if (!hit) return false;
  777 |       hit.el.setAttribute('data-gl-pixels-under-test', '1');
  778 |       return true;
  779 |     }, sel);
  780 |     if (!tagged) return null;
  781 |     const png = await page.locator('[data-gl-pixels-under-test]').screenshot({
  782 |       timeout: 60000, style: PIXELS_ONLY_STYLE,
  783 |     });
  784 |     return { ...pixelStats(readPng(png)), png };
  785 |   }
  786 | }
  787 | 
```