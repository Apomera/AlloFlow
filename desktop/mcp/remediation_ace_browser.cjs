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
  const allowed = (value, type) => {
    try {
      const url = new URL(value);
      if (url.protocol === 'file:') return !url.hostname && !!containedFile(root, fileURLToPath(url));
      if (value === 'about:blank') return true;
      // Only passive raster data images are needed by supported EPUB content.
      return type === 'image' && /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/i.test(value);
    } catch (_) { return false; }
  };
  puppeteer.launch = async function(options = {}) {
    // Upstream Ace disables Chromium's OS sandbox. Remove those switches and
    // never retry without the sandbox if the host cannot launch safely.
    const args = (options.args || []).filter(arg => !/^(?:--no-sandbox|--disable-.*sandbox|--single-process|--no-zygote|--disable-web-security|--allow-file-access-from-files)(?:=|$)/.test(arg));
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
        on('request', request => {
          if (!allowed(request.url(), request.resourceType())) {
            Promise.resolve(request.abort('blockedbyclient')).catch(() => browser.close());
          } else if (request.resourceType() === 'document' && request.url().startsWith('file:')) {
            // Validate containment before Node reads any document bytes. This
            // response takes precedence over upstream's unrestricted file read.
            let fd;
            try {
              const file = containedFile(root, fileURLToPath(request.url()));
              if (!file) throw Error('Ace document escaped its private EPUB tree.');
              fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
              if (!fs.fstatSync(fd).isFile()) throw Error('Ace document is not a regular file.');
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
        page.on = (event, listener) => on(event, event === 'request' ? request => {
          if (!request.isInterceptResolutionHandled()) return listener(request);
        } : listener);
        // EPUB scripts are blocked by document CSP. Ace's trusted audit scripts
        // execute through CDP without disabling CSP for the EPUB content.
        page.addScriptTag = async options => {
          if (!options || options.url || (!options.path && typeof options.content !== 'string')) throw Error('Unsupported Ace audit script source.');
          let source = options.content;
          if (options.path) {
            const file = containedFile(scripts, options.path);
            if (!file) throw Error('Ace audit script escaped its bundled runtime.');
            source = fs.readFileSync(file, 'utf8');
          }
          await page.evaluate(source);
          return page.evaluateHandle(() => {
            const element = document.createElement('script');
            element.setAttribute('data-ace', ''); document.head.appendChild(element); return element;
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
