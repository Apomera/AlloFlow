/**
 * AlloFlow Built-in Web Search Module
 * Replaces SearXNG — runs in-process within Electron (no external server).
 * Scrapes DuckDuckGo HTML for search results via the lite endpoint.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// In-process search server on localhost
let server = null;
let serverPort = 8888;

/**
 * Fetch a URL and return the response body as a string.
 */
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const mod = parsedUrl.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers
      },
      timeout: 10000
    };

    const req = mod.request(reqOptions, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
        }
        fetchUrl(redirectUrl, options).then(resolve).catch(reject);
        return;
      }

      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end(options.body || undefined);
  });
}

/**
 * Search DuckDuckGo HTML lite and parse results.
 * Returns array of {title, url, snippet}.
 */
async function searchDuckDuckGo(query, maxResults = 10) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  const html = await fetchUrl(url);

  const results = [];

  // Parse result blocks: each result is in a <div class="result ...">
  // Title link: <a class="result__a" href="...">title</a>
  // Snippet: <a class="result__snippet" ...>snippet text</a>
  const resultBlocks = html.split(/class="result\s/g).slice(1);

  for (const block of resultBlocks) {
    if (results.length >= maxResults) break;

    // Extract title and URL from result__a
    const titleMatch = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;

    let resultUrl = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();

    // DuckDuckGo wraps URLs through a redirect — extract the real URL
    const uddgMatch = resultUrl.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      resultUrl = decodeURIComponent(uddgMatch[1]);
    }

    // Skip DuckDuckGo internal links
    if (!resultUrl || resultUrl.includes('duckduckgo.com') || !title) continue;

    // Extract snippet
    let snippet = '';
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    if (snippetMatch) {
      snippet = snippetMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    results.push({ title, url: resultUrl, snippet });
  }

  return results;
}

/**
 * Start the built-in search server (SearXNG-compatible JSON API on localhost).
 * The existing searchProvider.js in the client app queries /search?q=...&format=json
 */
function startSearchServer(port = 8888) {
  return new Promise((resolve, reject) => {
    if (server) {
      console.log('[search-module] Server already running on port', serverPort);
      resolve(serverPort);
      return;
    }

    serverPort = port;
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health check at root
      if (url.pathname === '/' || url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', engine: 'alloflow-search' }));
        return;
      }

      // Local AI config endpoint — serves ~/.alloflow/ai_config.json to the web app
      if (url.pathname === '/local-config') {
        try {
          const configPath = require('path').join(require('os').homedir(), '.alloflow', 'ai_config.json');
          const fs = require('fs');
          if (fs.existsSync(configPath)) {
            const config = fs.readFileSync(configPath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(config);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No local config — run AlloFlow setup first' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // Search endpoint (SearXNG-compatible)
      if (url.pathname === '/search') {
        const query = url.searchParams.get('q');
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing query parameter "q"' }));
          return;
        }

        try {
          const maxResults = parseInt(url.searchParams.get('pageno') || '1') * 10;
          const ddgResults = await searchDuckDuckGo(query, maxResults);

          // Format as SearXNG-compatible response
          const response = {
            query: query,
            number_of_results: ddgResults.length,
            results: ddgResults.map((r, i) => ({
              url: r.url,
              title: r.title,
              content: r.snippet,
              engine: 'duckduckgo',
              score: 1.0 - (i * 0.05),
              category: 'general',
              positions: [i + 1]
            }))
          };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (err) {
          console.error('[search-module] Search error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[search-module] Search server running on http://127.0.0.1:${port}`);
      resolve(port);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[search-module] Port ${port} in use, trying ${port + 1}`);
        server = null;
        startSearchServer(port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Stop the search server.
 */
function stopSearchServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[search-module] Search server stopped');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = { startSearchServer, stopSearchServer, searchDuckDuckGo };
