/**
 * AlloFlow Service Updates Manager
 * Checks for available updates for all services (LM Studio, Piper, Flux)
 * and notifies the UI when updates are available.
 */

'use strict';

const https = require('https');
const { execSync } = require('child_process');

class ServiceUpdatesManager {
  constructor() {
    this.updateCache = {};
    this.lastCheckTime = {};
    this.checkInterval = 24 * 60 * 60 * 1000; // 24 hours between checks
    this.mainWindow = null;
  }

  /**
   * Set the main window for notifications
   */
  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Check for updates for a specific service
   * @param {string} serviceId - 'llm-engine', 'piper', or 'flux'
   * @returns {Promise<{available: boolean, currentVersion: string, latestVersion: string, downloadUrl: string} | null>}
   */
  async checkServiceUpdate(serviceId) {
    const now = Date.now();
    const lastCheck = this.lastCheckTime[serviceId] || 0;

    // Don't check more than once per 24 hours
    if (now - lastCheck < this.checkInterval && this.updateCache[serviceId]) {
      return this.updateCache[serviceId];
    }

    let result = null;

    try {
      switch (serviceId) {
        case 'llm-engine':
          result = await this._checkLMStudioUpdate();
          break;
        case 'piper':
          result = await this._checkPiperUpdate();
          break;
        case 'flux':
          result = await this._checkFluxUpdate();
          break;
        default:
          console.warn(`[updates] Unknown service: ${serviceId}`);
          return null;
      }

      this.lastCheckTime[serviceId] = now;
      this.updateCache[serviceId] = result;

      // Notify UI if update available
      if (result && result.available && this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('service:update-available', {
          serviceId,
          ...result
        });
        console.log(`[updates] ${serviceId}: v${result.currentVersion} → v${result.latestVersion} available`);
      }

      return result;
    } catch (err) {
      console.warn(`[updates] Failed to check ${serviceId} updates:`, err.message);
      return null;
    }
  }

  /**
   * Check for all service updates in parallel
   */
  async checkAllUpdates() {
    const results = await Promise.all([
      this.checkServiceUpdate('llm-engine'),
      this.checkServiceUpdate('piper'),
      this.checkServiceUpdate('flux')
    ]);

    return {
      'llm-engine': results[0],
      piper: results[1],
      flux: results[2]
    };
  }

  /**
   * Get cached update info for a service (without checking)
   */
  getUpdateStatus(serviceId) {
    return this.updateCache[serviceId] || null;
  }

  /**
   * Get all cached update statuses
   */
  getAllUpdateStatuses() {
    return {
      'llm-engine': this.updateCache['llm-engine'] || null,
      piper: this.updateCache.piper || null,
      flux: this.updateCache.flux || null
    };
  }

  // ── LM Studio ───────────────────────────────────────────────────────────

  async _checkLMStudioUpdate() {
    // LM Studio manages its own updates through the app
    // We just check if it's installed and accessible
    return null;
  }

  // ── Piper ───────────────────────────────────────────────────────────────

  async _checkPiperUpdate() {
    const currentVersion = await this._getPiperCurrentVersion();
    if (!currentVersion) return null;

    const latestRelease = await this._fetchGitHubLatestRelease('rhasspy', 'piper');
    if (!latestRelease) return null;

    const latestVersion = latestRelease.tag_name.replace(/^v/, '');

    return {
      available: this._compareVersions(latestVersion, currentVersion) > 0,
      currentVersion,
      latestVersion,
      downloadUrl: 'https://github.com/rhasspy/piper/releases',
      releaseUrl: latestRelease.html_url,
      releaseName: latestRelease.name,
      releaseNotes: latestRelease.body || ''
    };
  }

  async _getPiperCurrentVersion() {
    try {
      // Piper doesn't have a version flag, so check from the installation path
      // Look for version info in ~\.alloflow\bin\piper\VERSION or similar
      const { execSync: exec } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const piperDir = path.join(os.homedir(), '.alloflow', 'bin', 'piper');
      const versionFile = path.join(piperDir, 'VERSION');

      if (fs.existsSync(versionFile)) {
        return fs.readFileSync(versionFile, 'utf-8').trim();
      }

      // Fallback: check piper.exe version info (Windows)
      try {
        const output = exec(`wmic datafile where name="${piperDir}\\\\piper\\\\piper.exe" get Version 2>nul`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim().split('\n')[1];
        return output && output.trim();
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  // ── Flux ───────────────────────────────────────────────────────────────

  async _checkFluxUpdate() {
    // Flux is installed via pip as a Python package
    const currentVersion = await this._getFluxCurrentVersion();
    if (!currentVersion) return null;

    // Check PyPI for latest version
    const latestInfo = await this._fetchPyPIPackageInfo('diffusers');
    if (!latestInfo) return null;

    const latestVersion = latestInfo.version;

    return {
      available: this._compareVersions(latestVersion, currentVersion) > 0,
      currentVersion,
      latestVersion,
      downloadUrl: 'https://pypi.org/project/diffusers/',
      releaseName: `diffusers v${latestVersion}`,
      releaseNotes: 'Update available via pip install --upgrade diffusers'
    };
  }

  async _getFluxCurrentVersion() {
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      const piperDir = path.join(os.homedir(), '.alloflow', 'bin', 'flux', 'venv', 'lib');

      // Find Python site-packages
      const libDirs = fs.readdirSync(piperDir);
      for (const libDir of libDirs) {
        if (libDir.startsWith('python')) {
          const sitePkgPath = path.join(piperDir, libDir, 'site-packages', 'diffusers', 'VERSION');
          if (fs.existsSync(sitePkgPath)) {
            return fs.readFileSync(sitePkgPath, 'utf-8').trim();
          }
        }
      }

      // Fallback: pip show
      const output = execSync(
        `"${path.join(os.homedir(), '.alloflow', 'bin', 'flux', 'venv', 'Scripts', 'pip.exe')}" show diffusers 2>nul`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      const versionLine = output.split('\n').find(l => l.startsWith('Version:'));
      return versionLine ? versionLine.split(':')[1].trim() : null;
    } catch {
      return null;
    }
  }

  // ── GitHub Release Fetching ──────────────────────────────────────────────

  async _fetchGitHubLatestRelease(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/latest`,
        method: 'GET',
        headers: {
          'User-Agent': 'AlloFlow/0.4.2',
          'Accept': 'application/vnd.github+json'
        },
        timeout: 10000
      };

      https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null)).on('timeout', function() {
        this.destroy();
        resolve(null);
      }).end();
    });
  }

  // ── PyPI Package Fetching ────────────────────────────────────────────────

  async _fetchPyPIPackageInfo(packageName) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'pypi.org',
        path: `/pypi/${packageName}/json`,
        method: 'GET',
        headers: {
          'User-Agent': 'AlloFlow/0.4.2'
        },
        timeout: 10000
      };

      https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data);
              resolve({
                version: json.info.version,
                releaseUrl: json.info.project_urls?.Homepage || `https://pypi.org/project/${packageName}/`
              });
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null)).on('timeout', function() {
        this.destroy();
        resolve(null);
      }).end();
    });
  }

  // ── Version Comparison ───────────────────────────────────────────────────

  /**
   * Compare two semantic version strings
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  _compareVersions(v1, v2) {
    const parse = (v) => {
      return v.split('.').map(x => parseInt(x, 10) || 0);
    };

    const parts1 = parse(v1);
    const parts2 = parse(v2);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }
}

module.exports = new ServiceUpdatesManager();
