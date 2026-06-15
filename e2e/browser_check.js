/**
 * AlloFlow E2E — Browser smoke test driver.
 *
 * Runs inside Electron (real Chromium). Loads the local app, then collects:
 *   - console errors / warnings
 *   - failed network requests (HTTP >= 400 or connection errors)
 *   - whether the page loaded and React mounted
 *
 * Prints a JSON report between __E2E_REPORT__ ... __END__ markers on stdout.
 * Invoked by run_e2e.js:  electron e2e/browser_check.js
 */

'use strict';

const { app, BrowserWindow } = require('electron');

const URL_TO_TEST = process.env.E2E_URL || 'http://localhost:3730';
const WAIT_MS     = parseInt(process.env.E2E_WAIT_MS || '15000', 10);

const report = {
    url: URL_TO_TEST,
    loaded: false,
    loadError: null,
    reactMounted: false,
    consoleErrors: [],
    consoleWarnings: [],
    failedRequests: [],
};

app.whenReady().then(() => {
    const win = new BrowserWindow({
        show: false,
        width: 1280,
        height: 800,
        webPreferences: { offscreen: true, backgroundThrottling: false },
    });

    win.webContents.on('console-message', (_e, level, message) => {
        // level: 0 verbose, 1 info, 2 warning, 3 error
        if (level === 3) report.consoleErrors.push(message);
        else if (level === 2) report.consoleWarnings.push(message);
    });

    win.webContents.on('did-finish-load', () => { report.loaded = true; });
    win.webContents.on('did-fail-load', (_e, code, desc) => {
        report.loadError = `${desc} (${code})`;
    });

    // Track every request that fails or returns >= 400
    const ses = win.webContents.session;
    ses.webRequest.onCompleted((details) => {
        if (details.statusCode >= 400) {
            report.failedRequests.push({ url: details.url, status: details.statusCode });
        }
    });
    ses.webRequest.onErrorOccurred((details) => {
        if (details.error !== 'net::ERR_ABORTED') {
            report.failedRequests.push({ url: details.url, status: details.error });
        }
    });

    win.loadURL(URL_TO_TEST);

    setTimeout(async () => {
        try {
            report.reactMounted = await win.webContents.executeJavaScript(
                `(document.getElementById('root') && document.getElementById('root').children.length > 0)`
            );
        } catch { /* leave false */ }

        // Optional: report whether an expected selector is present (e.g. the
        // remediation modal when loaded with ?mode=remediation).
        const expectSelector = process.env.E2E_EXPECT_SELECTOR;
        if (expectSelector) {
            try {
                report.selectorFound = await win.webContents.executeJavaScript(
                    `!!document.querySelector(${JSON.stringify(expectSelector)})`
                );
            } catch { report.selectorFound = false; }
        }

        process.stdout.write('__E2E_REPORT__' + JSON.stringify(report) + '__END__\n');
        app.exit(report.consoleErrors.length > 0 || !report.loaded ? 1 : 0);
    }, WAIT_MS);
});
