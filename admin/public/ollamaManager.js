const http = require('http');
const https = require('https');
const nativePM = require('./nativeProcessManager');

/**
 * Ollama Model Manager
 * Handles model detection, pulling, and update checking
 */
class OllamaManager {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.lastUpdateCheck = 0;
  }

  /**
   * Get list of installed models
   */
  async getInstalledModels() {
    try {
      const response = await this._fetchOllama('/api/tags');
      const data = JSON.parse(response);
      return (data.models || []).map(m => ({
        name: m.name,
        digest: m.digest,
        size: m.size,
        modifiedAt: m.modified_at
      }));
    } catch (err) {
      console.error('[Ollama] Failed to get installed models:', err.message);
      return [];
    }
  }

  /**
   * List of popular models to suggest
   */
  getAvailableModels() {
    return [
      {
        id: 'neural-chat:7b',
        name: 'Neural Chat 7B',
        description: 'Fast, conversational, great for chat',
        size: '4.2 GB',
        recommended: true,
        tier: 'entry'
      },
      {
        id: 'llama3.1:8b',
        name: 'Llama 3.1 8B',
        description: 'Balanced quality, good reasoning',
        size: '4.7 GB',
        recommended: true,
        tier: 'mid'
      },
      {
        id: 'mistral:7b',
        name: 'Mistral 7B',
        description: 'Fast and efficient, creative',
        size: '3.9 GB',
        recommended: false,
        tier: 'entry'
      },
      {
        id: 'deepseek-coder:7b',
        name: 'DeepSeek Coder 7B',
        description: 'Specialized for code, good for developers',
        size: '3.8 GB',
        recommended: false,
        tier: 'entry'
      },
      {
        id: 'llama3.1:13b',
        name: 'Llama 3.1 13B',
        description: 'Powerful, good for complex tasks',
        size: '7.3 GB',
        recommended: false,
        tier: 'power'
      },
      {
        id: 'mixtral:8x7b',
        name: 'Mixtral 8x7B',
        description: 'Expert mixture, very capable',
        size: '26.0 GB',
        recommended: false,
        tier: 'power'
      }
    ];
  }

  /**
   * Pull a model from Ollama
   * @param {string} modelId - Model identifier (e.g. 'llama3.1:8b')
   * @param {function} onProgress - Callback for progress updates
   */
  async pullModel(modelId, onProgress = null) {
    return new Promise((resolve, reject) => {
      const url = `${this.ollamaUrl}/api/pull`;
      const postData = JSON.stringify({ name: modelId, stream: true });

      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let buffer = '';
        
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line

          lines.forEach(line => {
            if (!line.trim()) return;
            try {
              const event = JSON.parse(line);
              if (onProgress) {
                onProgress({
                  status: event.status || 'Downloading...',
                  digest: event.digest || '',
                  completed: event.completed || 0,
                  total: event.total || 0
                });
              }
            } catch (e) { /* skip invalid lines */ }
          });
        });

        res.on('end', () => {
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer);
              if (onProgress) {
                onProgress({
                  status: event.status || 'Complete',
                  digest: event.digest || '',
                  completed: event.completed || event.total || 0,
                  total: event.total || 0
                });
              }
            } catch (e) { /* skip */ }
          }
          resolve();
        });
      });

      req.on('error', reject);
      req.setTimeout(3600000, () => reject(new Error('Model pull timeout (1 hour)')));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Check Ollama version and availability
   */
  async checkOllamaStatus() {
    try {
      const response = await this._fetchOllama('/api/tags');
      const data = JSON.parse(response);
      return {
        isRunning: true,
        modelCount: (data.models || []).length,
        models: data.models || []
      };
    } catch (err) {
      return {
        isRunning: false,
        modelCount: 0,
        models: [],
        error: err.message
      };
    }
  }

  /**
   * Check for Ollama updates (from GitHub releases)
   */
  async checkForUpdates() {
    const now = Date.now();
    if (now - this.lastUpdateCheck < this.updateCheckInterval) {
      return null; // Don't check too frequently
    }

    this.lastUpdateCheck = now;

    try {
      const response = await this._fetchFromUrl(
        'https://api.github.com/repos/ollama/ollama/releases/latest'
      );
      const data = JSON.parse(response);
      return {
        latestVersion: data.tag_name || 'unknown',
        releaseUrl: data.html_url,
        publishedAt: data.published_at,
        body: data.body || ''
      };
    } catch (err) {
      console.warn('[Ollama] Update check failed:', err.message);
      return null;
    }
  }

  /**
   * Internal: Fetch from Ollama API
   */
  _fetchOllama(endpoint) {
    return new Promise((resolve, reject) => {
      http.get(`${this.ollamaUrl}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Internal: Fetch from any HTTPS URL
   */
  _fetchFromUrl(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'AlloFlow' } }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject).setTimeout(10000);
    });
  }

  /**
   * Wait for Ollama to become healthy (ready to serve requests)
   * Used during startup to ensure Ollama is ready before pulling models
   * @param {number} maxWaitMs - Maximum time to wait in milliseconds (default: 30000)
   * @param {number} retryIntervalMs - Time between retry attempts (default: 1000)
   * @returns {Promise<void>} - Resolves when Ollama is healthy, rejects if timeout
   */
  async waitForHealthy(maxWaitMs = 30000, retryIntervalMs = 1000) {
    const startTime = Date.now();
    let lastError = null;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.checkOllamaStatus();
        if (status.isRunning) {
          console.log('[Ollama] Ollama is healthy and ready');
          return;
        }
      } catch (err) {
        lastError = err;
      }

      if (Date.now() - startTime < maxWaitMs) {
        await new Promise(r => setTimeout(r, retryIntervalMs));
      }
    }

    throw new Error(`Ollama failed to become healthy after ${maxWaitMs}ms: ${lastError?.message || 'Unknown error'}`);
  }
}

module.exports = new OllamaManager();
