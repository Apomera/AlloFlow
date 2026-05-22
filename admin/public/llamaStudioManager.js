/**
 * LM Studio Manager
 * Handles installation, spawning, and management of LM Studio (llama.cpp with ROCm support)
 * Used as the universal LLM engine for all GPU types
 *
 * LM Studio provides:
 * - Pre-built llama.cpp with ROCm GPU acceleration
 * - OpenAI-compatible API (http://localhost:1234/v1/...)
 * - Built-in model management and download
 * - GUI for easy model selection and settings
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { app } = require('electron');

const BINARIES_DIR = path.join(os.homedir(), '.alloflow', 'bin');
const LM_STUDIO_DIR = path.join(BINARIES_DIR, 'lm-studio');
const LM_STUDIO_PORT = 1234;
const LM_STUDIO_API_BASE = `http://127.0.0.1:${LM_STUDIO_PORT}/v1`;

let llamaStudioProcess = null;

/**
 * Check if LM Studio is already installed.
 * Looks for the executable in the standard location.
 */
function isLMStudioInstalled() {
  if (process.platform === 'win32') {
    // On Windows, look for LM Studio in AppData or .alloflow/bin
    const localExe = path.join(LM_STUDIO_DIR, 'lm-studio.exe');
    if (fs.existsSync(localExe)) return true;
    
    // Also check standard install location
    const standardPath = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'lm-studio', 'lm-studio.exe');
    return fs.existsSync(standardPath);
  }
  // For macOS/Linux, check /Applications or ~/.local/share
  if (process.platform === 'darwin') {
    return fs.existsSync('/Applications/LMStudio.app');
  }
  return false;
}

/**
 * Start LM Studio as a subprocess.
 * On Windows with ROCm, uses HIP_VISIBLE_DEVICES for GPU selection.
 */
async function startLMStudio() {
  return new Promise((resolve, reject) => {
    try {
      let exePath;
      
      if (process.platform === 'win32') {
        // Try local installation first, then standard location
        const localExe = path.join(LM_STUDIO_DIR, 'lm-studio.exe');
        const standardPath = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'lm-studio', 'lm-studio.exe');
        
        exePath = fs.existsSync(localExe) ? localExe : 
                 fs.existsSync(standardPath) ? standardPath : 
                 'lm-studio.exe';  // Try PATH
      } else if (process.platform === 'darwin') {
        exePath = '/Applications/LMStudio.app/Contents/MacOS/LMStudio';
      } else {
        exePath = 'lm-studio';  // Hope it's in PATH
      }

      console.log(`[lm-studio] Starting from: ${exePath}`);
      
      // LM Studio runs as a GUI app, but we can use command-line flags to configure it
      // Start it in headless/API-only mode if available
      const args = [
        '--port', LM_STUDIO_PORT.toString(),
        '--api-mode'  // If supported
      ];
      
      llamaStudioProcess = spawn(exePath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // GPU hints for ROCm on AMD
          HIP_VISIBLE_DEVICES: '0',  // Use first AMD GPU
          HSA_OVERRIDE_GFX_VERSION: '11.0'  // Help with GPU detection
        }
      });

      let stderr = '';
      llamaStudioProcess.stderr.on('data', (d) => {
        stderr += d.toString();
        console.log(`[lm-studio:err] ${d.toString().trim()}`);
      });
      
      llamaStudioProcess.stdout.on('data', (d) => {
        console.log(`[lm-studio] ${d.toString().trim()}`);
      });

      llamaStudioProcess.on('error', (err) => {
        console.error(`[lm-studio] Failed to start:`, err.message);
        reject(err);
      });

      llamaStudioProcess.on('close', (code) => {
        console.log(`[lm-studio] Process exited with code ${code}`);
        llamaStudioProcess = null;
      });

      console.log(`[lm-studio] Started LM Studio (PID ${llamaStudioProcess.pid})`);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Stop LM Studio process.
 */
function stopLMStudio() {
  if (llamaStudioProcess) {
    console.log(`[lm-studio] Stopping (PID ${llamaStudioProcess.pid})`);
    llamaStudioProcess.kill('SIGTERM');
    llamaStudioProcess = null;
  }
}

/**
 * Check if LM Studio API is responding.
 * Tests the health endpoint.
 */
async function checkLMStudioHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${LM_STUDIO_API_BASE}/models`, (res) => {
      console.log(`[lm-studio] Health check: ${res.statusCode}`);
      resolve({ healthy: res.statusCode >= 200 && res.statusCode < 300 });
    });
    
    req.on('error', (err) => {
      console.log(`[lm-studio] Health check failed:`, err.message);
      resolve({ healthy: false, error: err.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ healthy: false, error: 'timeout' });
    });
  });
}

/**
 * Get list of models available in LM Studio.
 * Queries the OpenAI-compatible /v1/models endpoint.
 */
async function getAvailableModels() {
  return new Promise((resolve) => {
    const req = http.get(`${LM_STUDIO_API_BASE}/models`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // LM Studio returns { object: 'list', data: [ { id: 'model-name', ... }, ... ] }
          resolve(parsed.data || []);
        } catch (err) {
          console.error(`[lm-studio] Failed to parse models response:`, err.message);
          resolve([]);
        }
      });
    });
    
    req.on('error', (err) => {
      console.warn(`[lm-studio] Failed to get models:`, err.message);
      resolve([]);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve([]);
    });
  });
}

/**
 * Download and install LM Studio.
 * For Windows/AMD, downloads from https://releases.lmstudio.ai/win/x64/latest
 */
async function downloadAndInstallLMStudio(onProgress) {
  // Get the correct download URL based on platform
  const platform = process.platform;
  let downloadUrl;
  
  if (platform === 'win32') {
    downloadUrl = 'https://lmstudio.ai/download/latest/win32/x64';
  } else if (platform === 'darwin') {
    downloadUrl = 'https://lmstudio.ai/download/latest/osx/arm64';
  } else {
    downloadUrl = 'https://lmstudio.ai/download/latest/linux/x64';
  }
  
  const installerPath = path.join(BINARIES_DIR, 'lm-studio-installer' + (platform === 'win32' ? '.exe' : platform === 'darwin' ? '.dmg' : '.AppImage'));
  
  // Ensure directory exists
  if (!fs.existsSync(BINARIES_DIR)) {
    fs.mkdirSync(BINARIES_DIR, { recursive: true });
  }
  
  onProgress({ status: 'Downloading LM Studio...', progress: 10 });
  
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(downloadUrl);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.get(downloadUrl, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`[lm-studio] Following redirect to ${res.headers.location}`);
          downloadAndInstallLMStudio(onProgress).then(resolve).catch(reject);
          return;
        }
        
        // Handle HTTP errors
        if (res.statusCode === 404) {
          reject(new Error(`LM Studio download not found (HTTP 404). Please check your internet connection or visit https://lmstudio.ai/download`));
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        
        const totalLength = parseInt(res.headers['content-length'], 10);
        let downloadedLength = 0;
        
        const stream = fs.createWriteStream(installerPath);
        
        res.on('data', (chunk) => {
          downloadedLength += chunk.length;
          const percentComplete = Math.round((downloadedLength / totalLength) * 60) + 10;  // 10-70%
          onProgress({ status: 'Downloading LM Studio...', progress: percentComplete });
        });
        
        res.pipe(stream);
        
        stream.on('finish', () => {
          console.log(`[lm-studio] Installer downloaded to ${installerPath}`);
          
          // Run installer
          onProgress({ status: 'Installing LM Studio...', progress: 70 });
          
          console.log(`[lm-studio] Installer ready at: ${installerPath}`);
          console.log(`[lm-studio] User must run installer to complete LM Studio setup`);
          
          onProgress({ status: 'LM Studio installer downloaded. Please run it to complete setup.', progress: 100 });
          resolve(true);
        });
        
        stream.on('error', reject);
      });
      
      req.on('error', (err) => {
        console.error('[lm-studio] Download error:', err.message);
        reject(new Error(`Failed to download LM Studio: ${err.message}`));
      });
      req.setTimeout(300000, () => {
        req.destroy();
        reject(new Error('Download timeout'));
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * OpenAI API Compatibility Wrapper
 * Converts LM Studio's API responses to match what the app expects
 * (similar to Ollama's format but using OpenAI endpoints)
 */
class LMStudioAPIAdapter {
  /**
   * Translate LM Studio chat completion to Ollama-like streaming format
   */
  static streamChat(messages, options = {}) {
    const {
      model = 'default',
      temperature = 0.7,
      max_tokens = 2048,
      stream = true
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const payload = JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          stream
        });

        const url = new URL(`${LM_STUDIO_API_BASE}/chat/completions`);
        const options = {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 300000
        };

        const req = http.request(options, (res) => {
          if (res.statusCode !== 200) {
            let errorData = '';
            res.on('data', chunk => errorData += chunk);
            res.on('end', () => {
              reject(new Error(`API error ${res.statusCode}: ${errorData}`));
            });
            return;
          }

          // Create async iterator for streaming
          const iterator = (async function* () {
            for await (const chunk of res) {
              const line = chunk.toString().trim();
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.choices[0]?.delta?.content) {
                    yield data.choices[0].delta.content;
                  }
                } catch (err) {
                  console.error(`[lm-studio-adapter] Parse error:`, err.message);
                }
              }
            }
          })();

          resolve(iterator);
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get list of models in Ollama-compatible format
   */
  static async getModels() {
    const models = await getAvailableModels();
    return {
      models: models.map(m => ({
        name: m.id,
        digest: m.id,  // Placeholder
        size: 0,  // Let user figure it out
        modified_at: new Date().toISOString(),
        details: {
          format: 'llama.cpp',
          family: 'llama',
          parameter_size: 'unknown',
          quantization_level: 'unknown'
        }
      }))
    };
  }
}

// Export module functions
module.exports = {
  isLMStudioInstalled,
  startLMStudio,
  stopLMStudio,
  checkLMStudioHealth,
  getAvailableModels,
  downloadAndInstallLMStudio,
  LMStudioAPIAdapter,
  LM_STUDIO_PORT,
  LM_STUDIO_API_BASE,
  LM_STUDIO_DIR
};
