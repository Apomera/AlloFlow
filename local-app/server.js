/**
 * AlloFlow local-app dev server
 *
 * Serves local-app/build/ on localhost:3730 for development.
 * Run: node local-app/server.js
 *
 * In production the admin Electron app serves build/ via webAppServer.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PORT = process.env.PORT || 3730;
const BUILD_DIR = path.join(__dirname, 'build');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.map': 'application/json',
};

function serveFile(res, filePath) {
    if (!fs.existsSync(filePath)) return false;
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
    });
    res.end(content);
    return true;
}

const server = http.createServer((req, res) => {
    // Security: prevent path traversal
    const urlPath = req.url.split('?')[0].replace(/\\/g, '/');
    if (urlPath.includes('..')) {
        res.writeHead(400);
        res.end('Bad request');
        return;
    }

    const filePath = path.join(BUILD_DIR, urlPath === '/' ? 'index.html' : urlPath);

    // Serve from build/
    if (serveFile(res, filePath)) return;

    // Fallback to public/ (for assets not yet copied to build/)
    const publicPath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
    if (serveFile(res, publicPath)) return;

    // SPA fallback — serve index.html for all unmatched routes
    const indexPath = path.join(BUILD_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        serveFile(res, indexPath);
    } else {
        res.writeHead(404);
        res.end('Not found — run: node local_build.js\n');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n✅ AlloFlow local app: http://localhost:${PORT}`);
    console.log('   Press Ctrl+C to stop.\n');
});

// ── Optional: start SQLite backend alongside the frontend dev server ──────────
// Activated by: node server.js --with-backend
//            or: npm run start:all
if (process.argv.includes('--with-backend')) {
    const backendPath = path.join(__dirname, 'backend', 'server.js');
    if (fs.existsSync(backendPath)) {
        const backend = spawn(process.execPath, [backendPath], {
            stdio: 'inherit',
            env: { ...process.env },
        });
        backend.on('error', err => console.error('[backend]', err.message));
        process.on('exit', () => backend.kill());
        console.log('🗄️  Starting SQLite backend (port 3747)…');
    } else {
        console.warn('[server.js] --with-backend: backend/server.js not found');
    }
}
