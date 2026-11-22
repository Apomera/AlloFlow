'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const DOCUMENT_CSP = "default-src 'none'; script-src 'none'; script-src-elem 'none'; script-src-attr 'none'; connect-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; img-src file: data:; style-src file: 'unsafe-inline'; font-src file:; media-src 'none'";

function containedFile(root, candidate) {
  try {
    const real = fs.realpathSync(candidate), relative = path.relative(root, real);
    return relative && !relative.startsWith('..' + path.sep) && relative !== '..'
      && !path.isAbsolute(relative) && fs.lstatSync(real).isFile() ? real : null;
  } catch (_) { return null; }
}

function install(puppeteer, { epubRoot, trustedScriptRoot }) {
  const root = fs.realpathSync(epubRoot), scripts = fs.realpathSync(trustedScriptRoot);
  const launch = puppeteer.launch;
  if (typeof launch !== 'function') throw Error('Ace browser launch policy is unavailable.');
  const BLOCKED_FILE_TYPES = new Set(['script', 'xhr', 'fetch', 'websocket', 'eventsource', 'media', 'ping']);
  const MAX_DOC_BYTES = 32 * 1024 * 1024;
  const MAX_SCRIPT_BYTES = 16 * 1024 * 1024;
  const allowed = (value, type) => {
    try {
      const url = new URL(value);
      if (url.protocol === 'file:') {
        if (BLOCKED_FILE_TYPES.has(String(type || '').toLowerCase())) return false;
        return !url.hostname && !!containedFile(root, fileURLToPath(url));
      }
      if (value === 'about:blank') return true;
      // Only passive raster data images are needed by supported EPUB content.
      return type === 'image' && /^data:image\/(?:png|jpeg|jpg|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/i.test(value);
    } catch (_) { return false; }
  };
  puppeteer.launch = async function(options = {}) {
    // Upstream Ace disables Chromium's OS sandbox. Remove those switches and
    // never retry without the sandbox if the host cannot launch safely.
    const args = (Array.isArray(options.args) ? options.args : []).filter(arg => typeof arg === 'string' && !/^(?:--no-sandbox|--disable-.*sandbox|--single-process|--no-zygote|--disable-web-security|--allow-file-access-from-files|--allow-running-insecure-content|--disable-site-isolation-trials|--disable-features|--proxy-server|--proxy-pac-url|--host-resolver-rules|--remote-debugging-port|--remote-debugging-pipe|--load-extension|--disable-extensions-except|--user-data-dir|--js-flags)(?:=|$)/i.test(arg));
    const browser = await launch.call(puppeteer, { ...options, args, headless: true, pipe: true, ignoreDefaultArgs: false });
    const newPage = browser.newPage.bind(browser);
    browser.newPage = async function(...args) {
      const page = await newPage(...args);
      try {
        // CSP blocks EPUB code while trusted CDP-injected Axe code retains its
        // timers/event loop; disabling JavaScript would also stall Axe itself.
        await page.setJavaScriptEnabled(true);
        await page.setBypassCSP(false);
        // Use the stable CDP command explicitly: Puppeteer 25's newer network
        // rule command is incompatible with the installed Playwright Chromium.
        const network = await page.createCDPSession();
        await network.send('Network.enable');
        page.setOfflineMode = value => {
          if (value !== true) throw Error('Ace browser security policy cannot be disabled.');
          return network.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
        };
        await page.setOfflineMode(true);
        await page.setBypassServiceWorker(true);
        await page.setRequestInterception(true);
        for (const [name, required] of [['setJavaScriptEnabled', true], ['setBypassCSP', false], ['setOfflineMode', true],
          ['setBypassServiceWorker', true], ['setRequestInterception', true]]) {
          const original = page[name].bind(page);
          page[name] = value => {
            if (value !== required) throw Error('Ace browser security policy cannot be disabled.');
            return original(required);
          };
        }
        const on = page.on.bind(page);
        const once = typeof page.once === 'function' ? page.once.bind(page) : null;
        const prependListener = typeof page.prependListener === 'function' ? page.prependListener.bind(page) : null;
        const prependOnceListener = typeof page.prependOnceListener === 'function' ? page.prependOnceListener.bind(page) : null;
        on('request', request => {
          if (!allowed(request.url(), request.resourceType())) {
            Promise.resolve(request.abort('blockedbyclient')).catch(() => browser.close());
          } else if (request.resourceType() === 'document' && /^file:/i.test(request.url())) {
            // Validate containment before Node reads any document bytes. This
            // response takes precedence over upstream's unrestricted file read.
            let fd;
            try {
              const file = containedFile(root, fileURLToPath(request.url()));
              if (!file) throw Error('Ace document escaped its private EPUB tree.');
              fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
              const stat = fs.fstatSync(fd);
              if (!stat.isFile() || stat.size > MAX_DOC_BYTES) throw Error('Ace document is not a valid bounded regular file.');
              const body = fs.readFileSync(fd, 'utf8');
              const contentType = /\.html?$/i.test(file) ? 'text/html' : /\.svg$/i.test(file) ? 'image/svg+xml' : 'application/xhtml+xml';
              Promise.resolve(request.respond({ status: 200, contentType,
                headers: { 'Content-Security-Policy': DOCUMENT_CSP, 'X-Content-Type-Options': 'nosniff' }, body }))
                .catch(() => browser.close());
            } catch (_) { Promise.resolve(request.abort('blockedbyclient')).catch(() => browser.close()); }
            finally { if (fd !== undefined) fs.closeSync(fd); }
          }
        });
        // Run before upstream's HTML interceptor, which otherwise reads local
        // file URLs in Node. Do not let a second listener resume denied requests.
        const guardListener = (event, listener) => event === 'request' ? request => {
          if (!request.isInterceptResolutionHandled()) return listener(request);
        } : listener;
        page.on = (event, listener) => on(event, guardListener(event, listener));
        page.addListener = page.on;
        if (once) page.once = (event, listener) => once(event, guardListener(event, listener));
        if (prependListener) {
          page.prependListener = (event, listener) => event === 'request'
            ? on(event, guardListener(event, listener))
            : prependListener(event, listener);
        }
        if (prependOnceListener) {
          page.prependOnceListener = (event, listener) => event === 'request'
            ? (once ? once(event, guardListener(event, listener)) : on(event, guardListener(event, listener)))
            : prependOnceListener(event, listener);
        }
        // EPUB scripts are blocked by document CSP. Ace's trusted audit scripts
        // execute through CDP without disabling CSP for the EPUB content.
        page.addScriptTag = async options => {
          if (!options || options.url || (!options.path && typeof options.content !== 'string')) throw Error('Unsupported Ace audit script source.');
          let source = options.content;
          if (options.path) {
            const file = containedFile(scripts, options.path);
            if (!file) throw Error('Ace audit script escaped its bundled runtime.');
            let sfd;
            try {
              sfd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
              const sstat = fs.fstatSync(sfd);
              if (!sstat.isFile() || sstat.size > MAX_SCRIPT_BYTES) throw Error('Ace audit script is not a bounded regular file.');
              source = fs.readFileSync(sfd, 'utf8');
            } finally {
              if (sfd !== undefined) fs.closeSync(sfd);
            }
          } else if (source.length > MAX_SCRIPT_BYTES) {
            throw Error('Ace audit script exceeds size limit.');
          }
          await page.evaluate(source);
          return page.evaluateHandle(() => {
            const element = document.createElement('script');
            element.setAttribute('data-ace', ''); (document.head || document.documentElement).appendChild(element); return element;
          });
        };
        return page;
      } catch (error) { await page.close().catch(() => {}); throw error; }
    };
    return browser;
  };
  return { allowed };
}

module.exports = { install, containedFile, DOCUMENT_CSP };
